import { getDb, syncDb } from "./db.js";

export function logEvent({ level = "info", source = "app", message, workspaceId = null, userId = null, context = {} }) {
  const entry = {
    level,
    source,
    message: String(message || ""),
    workspaceId,
    userId,
    context,
    timestamp: new Date().toISOString(),
  };
  try {
    getDb().prepare(`INSERT INTO system_events
      (workspace_id, user_id, level, source, message, context_json)
      VALUES (?,?,?,?,?,?)`).run(
      workspaceId,
      userId,
      level,
      source,
      entry.message,
      JSON.stringify(context || {})
    );
    syncDb();
  } catch {}
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  sendSentry(entry);
  return entry;
}

async function sendSentry(entry) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || entry.level !== "error") return;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace("/", "");
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=canal-engine/1.0, sentry_key=${publicKey}`,
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ""),
        timestamp: entry.timestamp,
        level: entry.level,
        logger: entry.source,
        message: entry.message,
        extra: entry.context,
        user: entry.userId ? { id: String(entry.userId) } : undefined,
      }),
    });
  } catch {}
}

export function getSystemHealth() {
  const db = getDb();
  const recentErrors = db.prepare(`
    SELECT COUNT(*) c FROM system_events
    WHERE level='error' AND datetime(created_at) >= datetime('now','-24 hours')`).get().c;
  const aiCalls = db.prepare(`
    SELECT COUNT(*) c FROM ai_generations
    WHERE datetime(created_at) >= datetime('now','-24 hours')`).get().c;
  const billingEvents = db.prepare(`
    SELECT COUNT(*) c FROM billing_events
    WHERE datetime(created_at) >= datetime('now','-24 hours')`).get().c;
  return {
    ok: recentErrors === 0,
    recentErrors,
    aiCalls24h: aiCalls,
    billingEvents24h: billingEvents,
    sentryConfigured: !!process.env.SENTRY_DSN,
  };
}
