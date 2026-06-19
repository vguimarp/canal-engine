import { getDb } from "./db.js";
import { aiStatus } from "./aiProvider.js";
import { billingConfigStatus } from "./billingProviders.js";
import { getSystemHealth } from "./monitoring.js";

export const HEALTH_TABLES = [
  "users", "workspaces", "plans", "subscriptions", "usage_tracking", "billing_events",
  "billing_prices", "invoices", "provider_webhooks", "ai_generations", "system_events",
  "channels", "trends", "ideas", "videos", "social_posts", "keywords",
  "metrics", "thumbnails", "thumb_variants", "seo_packages", "distributions",
  "strategy", "learnings", "logs", "queues", "library_items",
  "media_assets", "execution_runs", "execution_steps", "execution_reports",
];

export function databaseHealth({ deep = false } = {}) {
  if (!deep && process.env.HEALTH_DEEP !== "1") return quickDatabaseHealth();
  const env = {
    onVercel: !!process.env.VERCEL,
    tursoUrlPresent: !!process.env.TURSO_DATABASE_URL,
    tursoTokenPresent: !!process.env.TURSO_AUTH_TOKEN,
  };
  const counts = {};
  let ok = true, error = null;
  try {
    const db = getDb();
    for (const table of HEALTH_TABLES) {
      try { counts[table] = db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c; }
      catch (e) { ok = false; counts[table] = `erro: ${e.message}`; }
    }
  } catch (e) {
    ok = false;
    error = e.message || String(e);
  }
  return {
    ok,
    mode: env.tursoTokenPresent ? "turso" : "demo",
    env,
    error,
    tablesExist: Object.keys(counts).length,
    counts,
  };
}

export function fullHealth() {
  return {
    ok: true,
    database: quickDatabaseHealth(),
    ai: aiStatus(),
    billing: billingConfigStatus(),
    monitoring: safeSystemHealth(),
    timestamp: new Date().toISOString(),
  };
}

export function quickDatabaseHealth() {
  const env = {
    onVercel: !!process.env.VERCEL,
    tursoUrlPresent: !!process.env.TURSO_DATABASE_URL,
    tursoTokenPresent: !!process.env.TURSO_AUTH_TOKEN,
  };
  return { ok: true, mode: env.tursoTokenPresent ? "turso" : "demo", env, deep: false };
}

function safeSystemHealth() {
  return {
    ok: true,
    recentErrors: 0,
    aiCalls24h: null,
    billingEvents24h: null,
    sentryConfigured: !!process.env.SENTRY_DSN,
    deep: false,
  };
}
