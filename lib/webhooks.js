import { getDb, syncDb } from "./db.js";
import { changeSubscription } from "./billingProviders.js";
import { logEvent } from "./monitoring.js";
import { createHmac, timingSafeEqual } from "crypto";

export function recordWebhook({ provider, eventId, eventType, payload, status = "received", error = null }) {
  const db = getDb();
  try {
    db.prepare(`INSERT INTO provider_webhooks
      (provider, event_id, event_type, status, payload, error)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(provider, event_id) DO UPDATE SET
        status=excluded.status,
        payload=excluded.payload,
        error=excluded.error`).run(provider, eventId || crypto.randomUUID(), eventType || "unknown", status, JSON.stringify(payload || {}), error);
    syncDb();
  } catch {}
}

export function verifyWebhook(provider, request, rawBody) {
  if (provider === "stripe") return verifyStripe(request, rawBody);
  if (provider === "mercado_pago") return !!process.env.MERCADO_PAGO_WEBHOOK_SECRET
    ? request.headers.get("x-signature") != null
    : false;
  if (provider === "pix") return !!process.env.PIX_WEBHOOK_SECRET
    ? request.headers.get("x-pix-signature") != null
    : false;
  return false;
}

function verifyStripe(request, rawBody) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get("stripe-signature") || "";
  if (!secret || !sig) return false;
  const parts = Object.fromEntries(sig.split(",").map((p) => p.split("=", 2)));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

export function processBillingWebhook({ provider, payload, verified }) {
  const eventId = payload.id || payload.data?.id || crypto.randomUUID();
  const eventType = payload.type || payload.action || payload.event || "unknown";
  recordWebhook({ provider, eventId, eventType, payload, status: verified ? "verified" : "received" });
  if (!verified) {
    logEvent({ level: "warn", source: `webhook.${provider}`, message: "Webhook recebido sem verificação de assinatura.", context: { eventType } });
    return { processed: false, reason: "webhook_signature_not_configured" };
  }

  const object = payload.data?.object || payload.resource || payload;
  const metadata = object?.metadata || payload.metadata || {};
  const external = String(object?.external_reference || payload.external_reference || "");
  const externalParts = external.includes(":") ? external.split(":") : [];
  const workspaceId = Number(metadata.workspace_id || metadata.workspaceId || externalParts[0] || 0);
  const userId = Number(metadata.user_id || metadata.userId || externalParts[1] || 0);
  const planCode = String(metadata.plan_code || metadata.planCode || externalParts[2] || "").toLowerCase();
  const interval = String(metadata.interval || "monthly").toLowerCase();
  if (!workspaceId || !userId || !["starter", "pro", "agency"].includes(planCode)) {
    recordWebhook({ provider, eventId, eventType, payload, status: "ignored", error: "metadata incompleta" });
    return { processed: false, reason: "missing_metadata" };
  }

  if (isActivationEvent(provider, eventType, payload)) {
    const subscriptionId = object?.subscription || object?.id || payload.id || null;
    const customerId = object?.customer || object?.payer?.id || null;
    changeSubscription({ workspaceId, userId, planCode, provider, interval, providerSubscriptionId: subscriptionId, providerCustomerId: customerId });
    recordWebhook({ provider, eventId, eventType, payload, status: "processed" });
    return { processed: true, action: "subscription_activated", planCode };
  }
  if (isCancellationEvent(eventType)) {
    changeSubscription({ workspaceId, userId, planCode: "free", provider, status: "cancelled" });
    recordWebhook({ provider, eventId, eventType, payload, status: "processed" });
    return { processed: true, action: "subscription_cancelled" };
  }
  return { processed: false, reason: "event_not_actionable" };
}

function isActivationEvent(provider, eventType, payload) {
  if (provider === "stripe") return ["checkout.session.completed", "invoice.paid", "customer.subscription.updated"].includes(eventType);
  if (provider === "mercado_pago") return payload.action === "payment.updated" || /approved|authorized/i.test(JSON.stringify(payload));
  if (provider === "pix") return /paid|approved|confirmed/i.test(eventType) || /paid|approved|confirmed/i.test(JSON.stringify(payload));
  return false;
}

function isCancellationEvent(eventType) {
  return /cancel|deleted|expired/i.test(eventType);
}
