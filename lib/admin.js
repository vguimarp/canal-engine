import { getDb, syncDb } from "./db.js";
import { PLANS } from "./account.js";
import { aiStatus } from "./aiProvider.js";
import { billingConfigStatus } from "./billingProviders.js";

const one = (db, sql, ...args) => db.prepare(sql).get(...args);
const all = (db, sql, ...args) => db.prepare(sql).all(...args);

export function getAdminSummary() {
  const db = getDb();
  const revenue = one(db, "SELECT COALESCE(SUM(amount_cents),0) cents FROM invoices WHERE status='paid'").cents;
  const activePaid = one(db, "SELECT COUNT(*) c FROM subscriptions WHERE status='active' AND plan_code!='free'").c;
  const cancelled = one(db, "SELECT COUNT(*) c FROM subscriptions WHERE status='cancelled'").c;
  const users = one(db, "SELECT COUNT(*) c FROM users").c;
  const mrr = all(db, "SELECT plan_code FROM subscriptions WHERE status='active' AND plan_code!='free'")
    .reduce((sum, r) => sum + planAmount(r.plan_code), 0);
  return {
    totals: {
      users,
      workspaces: one(db, "SELECT COUNT(*) c FROM workspaces").c,
      channels: one(db, "SELECT COUNT(*) c FROM channels").c,
      ideas: one(db, "SELECT COUNT(*) c FROM ideas").c,
      thumbnails: one(db, "SELECT COUNT(*) c FROM media_assets WHERE asset_type='thumbnail'").c,
      exports: one(db, "SELECT COUNT(*) c FROM user_events WHERE event_type='export_package'").c,
      activeUsers: one(db, "SELECT COUNT(*) c FROM users WHERE COALESCE(status,'active')='active'").c,
      errors24h: one(db, "SELECT COUNT(*) c FROM system_events WHERE level='error' AND created_at>=datetime('now','-1 day')").c,
      revenueEstimatedCents: revenue,
      mrrCents: mrr,
      arrCents: mrr * 12,
      payingUsers: activePaid,
      freeToPaidConversion: users ? Number(((activePaid / users) * 100).toFixed(1)) : 0,
      churnEstimated: activePaid + cancelled ? Number(((cancelled / (activePaid + cancelled)) * 100).toFixed(1)) : 0,
    },
    recentUsers: all(db, "SELECT id, email, name, phone, whatsapp, plan, role, status, created_at FROM users ORDER BY id DESC LIMIT 10"),
    plans: all(db, "SELECT plan_code, COUNT(*) count FROM subscriptions GROUP BY plan_code ORDER BY count DESC"),
  };
}

export function getAdminUsers(query = {}) {
  const db = getDb();
  const q = `%${String(query.q || "").trim()}%`;
  const filters = [];
  const vals = [];
  if (query.q) { filters.push("(email LIKE ? OR name LIKE ? OR phone LIKE ? OR whatsapp LIKE ?)"); vals.push(q, q, q, q); }
  for (const [key, column] of [["plan","plan"],["city","city"],["state","state"],["niche","niche"],["userType","user_type"],["leadStatus","lead_status"]]) {
    if (query[key]) { filters.push(`${column}=?`); vals.push(query[key]); }
  }
  for (const [key, column] of [["emailConsent","email_marketing_consent"],["whatsappConsent","whatsapp_marketing_consent"],["smsConsent","sms_marketing_consent"]]) {
    if (query[key] === "1") filters.push(`${column}=1`);
  }
  const rows = all(db, `SELECT * FROM users ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""} ORDER BY id DESC LIMIT 300`, ...vals);
  return rows.map((u) => ({
    id: u.id, email: u.email, name: u.name, phone: u.phone, whatsapp: u.whatsapp,
    city: u.city, state: u.state, userType: u.user_type, niche: u.niche,
    leadStatus: u.lead_status || "frio", crmTags: parseList(u.crm_tags),
    plan: u.plan, role: u.role || "user", status: u.status || "active",
    emailMarketingConsent: !!u.email_marketing_consent,
    whatsappMarketingConsent: !!u.whatsapp_marketing_consent,
    smsMarketingConsent: !!u.sms_marketing_consent,
    createdAt: u.created_at, lastLoginAt: u.last_login_at,
  }));
}

export function updateAdminUser(userId, data = {}, adminId = null) {
  const db = getDb();
  const sets = [];
  const vals = [];
  if (data.plan && PLANS.includes(data.plan)) { sets.push("plan=?"); vals.push(data.plan); }
  if (data.status && ["active", "inactive"].includes(data.status)) { sets.push("status=?"); vals.push(data.status); }
  if (data.role && ["user", "admin"].includes(data.role)) { sets.push("role=?"); vals.push(data.role); }
  if (data.leadStatus && ["quente", "frio", "morno"].includes(data.leadStatus)) { sets.push("lead_status=?"); vals.push(data.leadStatus); }
  if (Array.isArray(data.tags)) { sets.push("crm_tags=?"); vals.push(JSON.stringify(data.tags)); }
  if (!sets.length && (data.leadStatus || data.note)) {
    db.prepare("INSERT INTO admin_notes (user_id, admin_user_id, lead_status, note) VALUES (?,?,?,?)")
      .run(userId, adminId, data.leadStatus || null, data.note || null);
  }
  if (sets.length) {
    sets.push("updated_at=datetime('now')");
    db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id=?`).run(...vals, userId);
    const user = db.prepare("SELECT workspace_id, plan FROM users WHERE id=?").get(userId);
    if (data.plan && user?.workspace_id) {
      db.prepare(`INSERT INTO subscriptions (user_id, workspace_id, plan_code, status, provider)
        VALUES (?,?,?,?,?)
        ON CONFLICT(workspace_id) DO UPDATE SET plan_code=excluded.plan_code, status='active', provider='manual', updated_at=datetime('now')`)
        .run(userId, user.workspace_id, data.plan, "active", "manual");
    }
  }
  db.prepare("INSERT INTO user_events (user_id, event_type, metadata) VALUES (?,?,?)")
    .run(userId, "admin_user_updated", JSON.stringify({ adminId, fields: Object.keys(data) }));
  syncDb();
  return db.prepare("SELECT id, email, name, plan, role, status FROM users WHERE id=?").get(userId);
}

export function getAdminWorkspaces() {
  const db = getDb();
  return all(db, `SELECT w.*, u.email owner_email,
    (SELECT COUNT(*) FROM channels c WHERE c.workspace_id=w.id) channels,
    (SELECT COUNT(*) FROM ideas i JOIN channels c ON c.id=i.channel_id WHERE c.workspace_id=w.id) ideas,
    (SELECT COUNT(*) FROM videos v JOIN channels c ON c.id=v.channel_id WHERE c.workspace_id=w.id) videos
    FROM workspaces w LEFT JOIN users u ON u.id=w.owner_user_id
    ORDER BY w.id DESC LIMIT 200`);
}

export function getAdminBilling() {
  const db = getDb();
  return {
    subscriptions: all(db, "SELECT * FROM subscriptions ORDER BY id DESC LIMIT 200"),
    events: all(db, "SELECT * FROM billing_events ORDER BY id DESC LIMIT 200"),
    webhooks: all(db, "SELECT * FROM provider_webhooks ORDER BY id DESC LIMIT 200"),
    gateways: billingConfigStatus(),
  };
}

export function getAdminMedia() {
  const db = getDb();
  return {
    thumbnails: all(db, `SELECT ma.id, ma.video_id, ma.title, ma.file_name, ma.file_path, ma.created_at, v.title video_title
      FROM media_assets ma LEFT JOIN videos v ON v.id=ma.video_id
      WHERE ma.asset_type='thumbnail' ORDER BY ma.id DESC LIMIT 200`),
    exports: all(db, "SELECT * FROM user_events WHERE event_type='export_package' ORDER BY id DESC LIMIT 200"),
  };
}

export function getAdminLogs() {
  const db = getDb();
  return {
    userEvents: all(db, "SELECT * FROM user_events ORDER BY id DESC LIMIT 300"),
    systemEvents: all(db, "SELECT * FROM system_events ORDER BY id DESC LIMIT 300"),
  };
}

export function getAdminSettings() {
  const db = getDb();
  return {
    plans: all(db, "SELECT * FROM plans ORDER BY id"),
    gateways: billingConfigStatus(),
    ai: aiStatus(),
    recovery: {
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      smsConfigured: !!process.env.SMS_TOKEN,
      whatsappConfigured: !!process.env.WHATSAPP_TOKEN,
    },
    maintenanceMode: process.env.MAINTENANCE_MODE === "1",
    campaigns: all(db, "SELECT * FROM marketing_campaigns ORDER BY id DESC LIMIT 100"),
  };
}

export function updateAdminSettings(data = {}) {
  const db = getDb();
  if (Array.isArray(data.plans)) {
    const stmt = db.prepare(`UPDATE plans SET channel_limit=?, idea_limit_monthly=?, execution_limit_monthly=?, workspace_limit=?, priority_processing=? WHERE code=?`);
    for (const p of data.plans) {
      stmt.run(p.channel_limit ?? null, p.idea_limit_monthly ?? null, p.execution_limit_monthly ?? null, p.workspace_limit ?? null, p.priority_processing ? 1 : 0, p.code);
    }
    syncDb();
  }
  return getAdminSettings();
}

export function getAdminOverview() {
  const summary = getAdminSummary();
  const billing = getAdminBilling();
  const logs = getAdminLogs();
  return {
    kpis: {
      users: summary.totals.users,
      activeUsers: summary.totals.activeUsers,
      channels: summary.totals.channels,
      ideas: summary.totals.ideas,
      thumbnails: summary.totals.thumbnails,
      exports: summary.totals.exports,
      revenueCents: summary.totals.revenueEstimatedCents,
      mrrCents: billing.subscriptions.filter((s) => s.status === "active" && s.plan_code !== "free").reduce((sum, s) => sum + planAmount(s.plan_code), 0),
      arrCents: 0,
      conversionRate: summary.totals.users ? Number((billing.subscriptions.filter((s) => s.plan_code !== "free").length / summary.totals.users * 100).toFixed(1)) : 0,
      aiCalls: getDb().prepare("SELECT COUNT(*) c FROM ai_generations").get().c,
      aiCostCents: 0,
      roi: "em validação",
    },
    users: getAdminUsers(),
    subscriptions: billing.subscriptions,
    billing: billing.events,
    logs: logs.systemEvents,
    ai: getDb().prepare("SELECT id, provider, task, status, created_at FROM ai_generations ORDER BY id DESC LIMIT 50").all(),
    system: { plans: summary.plans },
  };
}

function planAmount(plan) {
  if (plan === "starter") return 1900;
  if (plan === "pro") return 4900;
  if (plan === "agency") return 14900;
  return 0;
}

function parseList(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
