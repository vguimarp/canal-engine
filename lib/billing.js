import { getDb, syncDb } from "./db.js";

export const PLAN_DEFS = [
  {
    code: "free",
    name: "FREE",
    channelLimit: 1,
    ideaLimitMonthly: 20,
    executionLimitMonthly: 5,
    workspaceLimit: 1,
    priorityProcessing: false,
  },
  {
    code: "pro",
    name: "PRO",
    channelLimit: 10,
    ideaLimitMonthly: null,
    executionLimitMonthly: null,
    workspaceLimit: 1,
    priorityProcessing: false,
  },
  {
    code: "agency",
    name: "AGENCY",
    channelLimit: null,
    ideaLimitMonthly: null,
    executionLimitMonthly: null,
    workspaceLimit: null,
    priorityProcessing: true,
  },
];

const METRIC_LABELS = {
  channels: "canais",
  ideas: "ideias do mês",
  executions: "execuções do mês",
};

const METRIC_LIMIT_FIELD = {
  channels: "channelLimit",
  ideas: "ideaLimitMonthly",
  executions: "executionLimitMonthly",
  workspaces: "workspaceLimit",
};

export const BILLING_PROVIDERS = [
  { code: "stripe", name: "Stripe", ready: false },
  { code: "mercado_pago", name: "Mercado Pago", ready: false },
  { code: "pix", name: "PIX", ready: false },
];

export function currentPeriod(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function normalizeCode(code) {
  const c = String(code || "free").toLowerCase().trim();
  return PLAN_DEFS.some((p) => p.code === c) ? c : "free";
}

function rowToPlan(row) {
  if (!row) return PLAN_DEFS[0];
  return {
    code: row.code,
    name: row.name,
    channelLimit: row.channel_limit == null ? null : Number(row.channel_limit),
    ideaLimitMonthly: row.idea_limit_monthly == null ? null : Number(row.idea_limit_monthly),
    executionLimitMonthly: row.execution_limit_monthly == null ? null : Number(row.execution_limit_monthly),
    workspaceLimit: row.workspace_limit == null ? null : Number(row.workspace_limit),
    priorityProcessing: !!row.priority_processing,
  };
}

export function ensurePlans() {
  const db = getDb();
  const stmt = db.prepare(`INSERT INTO plans
    (code, name, channel_limit, idea_limit_monthly, execution_limit_monthly, workspace_limit, priority_processing, active)
    VALUES (?,?,?,?,?,?,?,1)
    ON CONFLICT(code) DO UPDATE SET
      name=excluded.name,
      channel_limit=excluded.channel_limit,
      idea_limit_monthly=excluded.idea_limit_monthly,
      execution_limit_monthly=excluded.execution_limit_monthly,
      workspace_limit=excluded.workspace_limit,
      priority_processing=excluded.priority_processing,
      active=1`);
  for (const p of PLAN_DEFS) {
    stmt.run(
      p.code,
      p.name,
      p.channelLimit,
      p.ideaLimitMonthly,
      p.executionLimitMonthly,
      p.workspaceLimit,
      p.priorityProcessing ? 1 : 0
    );
  }
  syncDb();
}

export function getPlans() {
  ensurePlans();
  return getDb().prepare("SELECT * FROM plans WHERE active=1 ORDER BY id").all().map(rowToPlan);
}

export function getPlan(code = "free") {
  ensurePlans();
  const row = getDb().prepare("SELECT * FROM plans WHERE code=? AND active=1").get(normalizeCode(code));
  return rowToPlan(row);
}

export function ensureSubscriptionForUser(userId, workspaceId, planCode = "free") {
  if (!userId || !workspaceId) return null;
  ensurePlans();
  const db = getDb();
  const existing = db.prepare("SELECT * FROM subscriptions WHERE workspace_id=?").get(workspaceId);
  if (existing) return existing;
  const code = normalizeCode(planCode);
  db.prepare(`INSERT INTO subscriptions
    (user_id, workspace_id, plan_code, status, provider)
    VALUES (?,?,?,?,?)`).run(userId, workspaceId, code, "active", "manual");
  db.prepare("UPDATE users SET plan=? WHERE id=?").run(code, userId);
  syncDb();
  return db.prepare("SELECT * FROM subscriptions WHERE workspace_id=?").get(workspaceId);
}

export function getWorkspaceSubscription(workspaceId, userId = null) {
  ensurePlans();
  const db = getDb();
  let sub = workspaceId ? db.prepare("SELECT * FROM subscriptions WHERE workspace_id=?").get(workspaceId) : null;
  if (!sub && userId && workspaceId) sub = ensureSubscriptionForUser(userId, workspaceId);
  if (!sub && userId) {
    const user = db.prepare("SELECT plan FROM users WHERE id=?").get(userId);
    return { plan_code: normalizeCode(user?.plan), status: "active", provider: "manual" };
  }
  return sub || { plan_code: "free", status: "active", provider: "manual" };
}

function monthlyIdeasUsed(workspaceId, period = currentPeriod()) {
  return getDb().prepare(`
    SELECT COUNT(*) c FROM ideas i
    JOIN channels c ON c.id=i.channel_id
    WHERE c.workspace_id=? AND strftime('%Y-%m', i.created_at)=?`).get(workspaceId, period).c;
}

function monthlyExecutionsUsed(workspaceId, period = currentPeriod()) {
  return getDb().prepare(`
    SELECT COUNT(*) c FROM execution_runs e
    JOIN channels c ON c.id=e.channel_id
    WHERE c.workspace_id=? AND strftime('%Y-%m', e.started_at)=?`).get(workspaceId, period).c;
}

function channelsUsed(workspaceId) {
  return getDb().prepare("SELECT COUNT(*) c FROM channels WHERE workspace_id=?").get(workspaceId).c;
}

function actualUsage(workspaceId, metric, period = currentPeriod()) {
  if (!workspaceId) return 0;
  if (metric === "channels") return channelsUsed(workspaceId);
  if (metric === "ideas") return monthlyIdeasUsed(workspaceId, period);
  if (metric === "executions") return monthlyExecutionsUsed(workspaceId, period);
  return 0;
}

export function syncUsageSnapshot(workspaceId, userId, metric, plan, period = currentPeriod()) {
  if (!workspaceId || !metric) return null;
  const db = getDb();
  const used = actualUsage(workspaceId, metric, period);
  const limit = plan?.[METRIC_LIMIT_FIELD[metric]] ?? null;
  db.prepare(`INSERT INTO usage_tracking
    (workspace_id, user_id, metric, period, used, limit_value, updated_at)
    VALUES (?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(workspace_id, metric, period) DO UPDATE SET
      user_id=excluded.user_id,
      used=excluded.used,
      limit_value=excluded.limit_value,
      updated_at=datetime('now')`).run(workspaceId, userId || null, metric, period, used, limit);
  return { metric, used, limit };
}

export function getBillingStatus({ workspaceId, userId }) {
  const sub = getWorkspaceSubscription(workspaceId, userId);
  const plan = getPlan(sub.plan_code);
  const period = currentPeriod();
  const usage = {
    channels: syncUsageSnapshot(workspaceId, userId, "channels", plan, period),
    ideas: syncUsageSnapshot(workspaceId, userId, "ideas", plan, period),
    executions: syncUsageSnapshot(workspaceId, userId, "executions", plan, period),
  };
  syncDb();
  return {
    subscription: {
      planCode: plan.code,
      planName: plan.name,
      status: sub.status || "active",
      provider: sub.provider || "manual",
      period,
      currentPeriodStart: sub.current_period_start || null,
      currentPeriodEnd: sub.current_period_end || null,
    },
    plan,
    usage,
    providers: BILLING_PROVIDERS,
  };
}

export function checkUsageLimit({ workspaceId, userId, metric, increment = 1 }) {
  const status = getBillingStatus({ workspaceId, userId });
  if (!userId) return { allowed: true, status };
  const plan = status.plan;
  const limit = plan[METRIC_LIMIT_FIELD[metric]];
  const used = actualUsage(workspaceId, metric);
  const next = used + Number(increment || 0);
  if (limit != null && next > limit) {
    const label = METRIC_LABELS[metric] || metric;
    return {
      allowed: false,
      status,
      message: `Seu plano ${plan.name} permite ${limit} ${label}. Você já usou ${used}. Faça upgrade para continuar.`,
    };
  }
  return { allowed: true, status };
}

export function recordBillingEvent({ workspaceId, userId, provider, eventType, planCode, payload = {}, status = "pending" }) {
  const db = getDb();
  const event = String(eventType || "checkout_requested");
  const providerCode = String(provider || "manual");
  const plan = normalizeCode(planCode);
  const r = db.prepare(`INSERT INTO billing_events
    (workspace_id, user_id, provider, event_type, status, plan_code, payload)
    VALUES (?,?,?,?,?,?,?)`).run(
    workspaceId || null,
    userId || null,
    providerCode,
    event,
    status,
    plan,
    JSON.stringify(payload || {})
  );
  syncDb();
  return { id: r.lastInsertRowid, provider: providerCode, eventType: event, status, planCode: plan };
}
