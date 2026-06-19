import { getDb } from "./db.js";

export function getAdminOverview() {
  const db = getDb();
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const revenue = one("SELECT COALESCE(SUM(amount_cents),0) cents FROM invoices WHERE status='paid'").cents;
  const activeSubs = one("SELECT COUNT(*) c FROM subscriptions WHERE status='active' AND plan_code!='free'").c;
  const users = one("SELECT COUNT(*) c FROM users").c;
  const activeUsers = one("SELECT COUNT(DISTINCT owner_user_id) c FROM channels WHERE owner_user_id IS NOT NULL").c;
  const ai = one("SELECT COUNT(*) calls FROM ai_generations").calls;
  const videos = one("SELECT COUNT(*) c FROM videos WHERE format='long'").c;
  const channels = one("SELECT COUNT(*) c FROM channels").c;
  const planRows = all("SELECT plan_code, COUNT(*) count FROM subscriptions GROUP BY plan_code ORDER BY count DESC");
  const monthlyRecurring = all("SELECT plan_code FROM subscriptions WHERE status='active' AND plan_code!='free'")
    .reduce((sum, r) => sum + planAmount(r.plan_code), 0);
  return {
    kpis: {
      revenueCents: revenue,
      mrrCents: monthlyRecurring,
      arrCents: monthlyRecurring * 12,
      conversionRate: users ? Number(((activeSubs / users) * 100).toFixed(1)) : 0,
      users,
      activeUsers,
      channels,
      videos,
      aiCalls: ai,
      aiCostCents: 0,
      roi: revenue > 0 ? "positivo" : "em validação",
    },
    users: all("SELECT id, email, name, plan, role, created_at FROM users ORDER BY id DESC LIMIT 50"),
    subscriptions: all("SELECT * FROM subscriptions ORDER BY id DESC LIMIT 50"),
    billing: all("SELECT * FROM billing_events ORDER BY id DESC LIMIT 50"),
    logs: all("SELECT * FROM system_events ORDER BY id DESC LIMIT 50"),
    ai: all("SELECT id, provider, task, status, created_at FROM ai_generations ORDER BY id DESC LIMIT 50"),
    system: { plans: planRows },
  };
}

function planAmount(plan) {
  if (plan === "starter") return 1900;
  if (plan === "pro") return 4900;
  if (plan === "agency") return 14900;
  return 0;
}
