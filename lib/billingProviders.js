import { getDb, syncDb } from "./db.js";
import { getPlan, recordBillingEvent } from "./billing.js";
import { logEvent } from "./monitoring.js";

export const INTERVALS = ["monthly", "annual"];
export const PROVIDERS = ["stripe", "mercado_pago", "pix"];

export function billingConfigStatus() {
  return {
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    mercado_pago: {
      configured: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
      webhookConfigured: !!process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    },
    pix: {
      configured: !!(process.env.PIX_KEY || process.env.MERCADO_PAGO_ACCESS_TOKEN),
      webhookConfigured: !!process.env.PIX_WEBHOOK_SECRET || !!process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    },
  };
}

export function getPrice(planCode, interval, provider) {
  return getDb().prepare(`
    SELECT * FROM billing_prices
    WHERE plan_code=? AND interval=? AND provider=? AND active=1`).get(planCode, interval, provider);
}

export async function createCheckout({ workspaceId, userId, planCode, interval = "monthly", provider = "stripe", origin }) {
  if (!["starter", "pro", "agency"].includes(planCode)) throw new Error("Escolha STARTER, PRO ou AGENCY.");
  if (!INTERVALS.includes(interval)) throw new Error("Escolha mensal ou anual.");
  if (!PROVIDERS.includes(provider)) throw new Error("Gateway não reconhecido.");
  const plan = getPlan(planCode);
  const price = getPrice(planCode, interval, provider);
  if (!price) throw new Error("Preço não configurado para este plano.");

  if (provider === "stripe") return stripeCheckout({ workspaceId, userId, plan, price, interval, origin });
  if (provider === "mercado_pago") return mercadoPagoCheckout({ workspaceId, userId, plan, price, interval, origin });
  return pixCheckout({ workspaceId, userId, plan, price, interval, origin });
}

function getUserEmail(userId) {
  if (!userId) return null;
  return getDb().prepare("SELECT email FROM users WHERE id=?").get(userId)?.email || null;
}

async function stripeCheckout({ workspaceId, userId, plan, price, interval, origin }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return missingGateway("stripe", workspaceId, userId, plan.code, interval);
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("success_url", `${origin}/billing?status=success`);
  body.set("cancel_url", `${origin}/billing?status=cancelled`);
  body.set("client_reference_id", `${workspaceId}:${userId}`);
  body.set("metadata[workspace_id]", String(workspaceId));
  body.set("metadata[user_id]", String(userId || ""));
  body.set("metadata[plan_code]", plan.code);
  body.set("metadata[interval]", interval);
  const email = getUserEmail(userId);
  if (email) body.set("customer_email", email);
  if (price.provider_price_id) {
    body.set("line_items[0][price]", price.provider_price_id);
    body.set("line_items[0][quantity]", "1");
  } else {
    body.set("line_items[0][price_data][currency]", String(price.currency || "BRL").toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(price.amount_cents));
    body.set("line_items[0][price_data][recurring][interval]", interval === "annual" ? "year" : "month");
    body.set("line_items[0][price_data][product_data][name]", `Canal Engine ${plan.name}`);
    body.set("line_items[0][quantity]", "1");
  }
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe recusou o checkout.");
  recordBillingEvent({ workspaceId, userId, provider: "stripe", eventType: "checkout_created", planCode: plan.code, payload: data, status: "created" });
  return { provider: "stripe", checkoutReady: true, checkoutUrl: data.url, sessionId: data.id };
}

async function mercadoPagoCheckout({ workspaceId, userId, plan, price, interval, origin }) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return missingGateway("mercado_pago", workspaceId, userId, plan.code, interval);
  if (process.env.MERCADO_PAGO_RECURRING === "1") {
    return mercadoPagoRecurringCheckout({ workspaceId, userId, plan, price, interval, origin, token });
  }
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{
        title: `Canal Engine ${plan.name} ${interval === "annual" ? "anual" : "mensal"}`,
        quantity: 1,
        currency_id: price.currency || "BRL",
        unit_price: Number(price.amount_cents || 0) / 100,
      }],
      back_urls: {
        success: `${origin}/billing?status=success`,
        failure: `${origin}/billing?status=failed`,
        pending: `${origin}/billing?status=pending`,
      },
      external_reference: `${workspaceId}:${userId}:${plan.code}:${interval}`,
      metadata: { workspace_id: workspaceId, user_id: userId, plan_code: plan.code, interval },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Mercado Pago recusou o checkout.");
  recordBillingEvent({ workspaceId, userId, provider: "mercado_pago", eventType: "checkout_created", planCode: plan.code, payload: data, status: "created" });
  return { provider: "mercado_pago", checkoutReady: true, checkoutUrl: data.init_point || data.sandbox_init_point, preferenceId: data.id };
}

async function mercadoPagoRecurringCheckout({ workspaceId, userId, plan, price, interval, origin, token }) {
  const email = getUserEmail(userId);
  if (!email) throw new Error("E-mail do usuário não encontrado para assinatura recorrente.");
  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: `Canal Engine ${plan.name} ${interval === "annual" ? "anual" : "mensal"}`,
      payer_email: email,
      back_url: `${origin}/billing?status=success`,
      external_reference: `${workspaceId}:${userId}:${plan.code}:${interval}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: interval === "annual" ? "years" : "months",
        transaction_amount: Number(price.amount_cents || 0) / 100,
        currency_id: price.currency || "BRL",
      },
      metadata: { workspace_id: workspaceId, user_id: userId, plan_code: plan.code, interval },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Mercado Pago recusou a assinatura recorrente.");
  recordBillingEvent({ workspaceId, userId, provider: "mercado_pago", eventType: "subscription_checkout_created", planCode: plan.code, payload: data, status: "created" });
  return { provider: "mercado_pago", checkoutReady: true, checkoutUrl: data.init_point, preapprovalId: data.id };
}

async function pixCheckout({ workspaceId, userId, plan, price, interval, origin }) {
  if (process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return mercadoPagoPixCheckout({ workspaceId, userId, plan, price, interval, origin });
  }
  const pixKey = process.env.PIX_KEY;
  if (!pixKey) return missingGateway("pix", workspaceId, userId, plan.code, interval);
  const event = recordBillingEvent({
    workspaceId,
    userId,
    provider: "pix",
    eventType: "pix_invoice_created",
    planCode: plan.code,
    payload: { interval, amount_cents: price.amount_cents, pixKey, origin },
    status: "pending",
  });
  return {
    provider: "pix",
    checkoutReady: true,
    eventId: event.id,
    amountCents: price.amount_cents,
    pixKey,
    message: "PIX gerado. A ativação do plano acontece após confirmação manual ou webhook configurado.",
  };
}

async function mercadoPagoPixCheckout({ workspaceId, userId, plan, price, interval, origin }) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const email = getUserEmail(userId);
  if (!email) throw new Error("E-mail do usuário não encontrado para gerar PIX.");
  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `ce-pix-${workspaceId}-${userId}-${plan.code}-${interval}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: Number(price.amount_cents || 0) / 100,
      description: `Canal Engine ${plan.name} ${interval === "annual" ? "anual" : "mensal"}`,
      payment_method_id: "pix",
      payer: { email },
      external_reference: `${workspaceId}:${userId}:${plan.code}:${interval}`,
      notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL || `${origin}/api/billing/webhook/mercado-pago`,
      metadata: { workspace_id: workspaceId, user_id: userId, plan_code: plan.code, interval, provider: "pix" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Mercado Pago recusou a geração do PIX.");
  recordBillingEvent({ workspaceId, userId, provider: "pix", eventType: "pix_invoice_created", planCode: plan.code, payload: data, status: data.status || "pending" });
  const tx = data.point_of_interaction?.transaction_data || {};
  return {
    provider: "pix",
    checkoutReady: true,
    paymentId: data.id,
    amountCents: price.amount_cents,
    qrCode: tx.qr_code,
    qrCodeBase64: tx.qr_code_base64,
    ticketUrl: tx.ticket_url,
    message: "PIX dinâmico gerado. O plano será atualizado automaticamente após confirmação do pagamento.",
  };
}

function missingGateway(provider, workspaceId, userId, planCode, interval) {
  const event = recordBillingEvent({
    workspaceId,
    userId,
    provider,
    eventType: "checkout_configuration_missing",
    planCode,
    payload: { interval },
    status: "needs_configuration",
  });
  return {
    provider,
    checkoutReady: false,
    event,
    message: "Gateway ainda não configurado. Defina as variáveis de ambiente para ativar pagamento real.",
  };
}

export async function createCustomerPortal({ workspaceId, userId, origin }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { portalReady: false, message: "Stripe ainda não configurado." };
  const sub = getDb().prepare("SELECT provider_customer_id FROM subscriptions WHERE workspace_id=?").get(workspaceId);
  if (!sub?.provider_customer_id) {
    return { portalReady: false, message: "Portal disponível após a primeira assinatura paga no Stripe." };
  }
  const body = new URLSearchParams();
  body.set("customer", sub.provider_customer_id);
  body.set("return_url", process.env.STRIPE_PORTAL_RETURN_URL || `${origin}/billing`);
  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe recusou o Portal do Cliente.");
  recordBillingEvent({ workspaceId, userId, provider: "stripe", eventType: "customer_portal_created", planCode: null, payload: data, status: "created" });
  return { portalReady: true, portalUrl: data.url };
}

export function changeSubscription({ workspaceId, userId, planCode, provider = "manual", status = "active", interval = "monthly", providerSubscriptionId = null, providerCustomerId = null }) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM subscriptions WHERE workspace_id=?").get(workspaceId);
  if (existing) {
    db.prepare(`UPDATE subscriptions SET
      plan_code=?, status=?, provider=?,
      provider_customer_id=COALESCE(?, provider_customer_id),
      provider_subscription_id=COALESCE(?, provider_subscription_id),
      updated_at=datetime('now'),
      current_period_start=date('now','start of month'),
      current_period_end=date('now','start of month',?)
      WHERE workspace_id=?`).run(
      planCode,
      status,
      provider,
      providerCustomerId,
      providerSubscriptionId,
      interval === "annual" ? "+1 year" : "+1 month",
      workspaceId
    );
  } else {
    db.prepare(`INSERT INTO subscriptions
      (user_id, workspace_id, plan_code, status, provider, provider_customer_id, provider_subscription_id, current_period_end)
      VALUES (?,?,?,?,?,?,?,date('now','start of month',?))`).run(
      userId,
      workspaceId,
      planCode,
      status,
      provider,
      providerCustomerId,
      providerSubscriptionId,
      interval === "annual" ? "+1 year" : "+1 month"
    );
  }
  if (userId) db.prepare("UPDATE users SET plan=? WHERE id=?").run(planCode, userId);
  syncDb();
  logEvent({ source: "billing", message: `Plano atualizado para ${planCode}`, workspaceId, userId, context: { provider, status, interval } });
  return db.prepare("SELECT * FROM subscriptions WHERE workspace_id=?").get(workspaceId);
}

export function cancelSubscription({ workspaceId, userId }) {
  const db = getDb();
  db.prepare("UPDATE subscriptions SET status='cancelled', updated_at=datetime('now') WHERE workspace_id=?").run(workspaceId);
  db.prepare("UPDATE users SET plan='free' WHERE id=?").run(userId);
  syncDb();
  recordBillingEvent({ workspaceId, userId, provider: "manual", eventType: "subscription_cancelled", planCode: "free", status: "cancelled" });
  return changeSubscription({ workspaceId, userId, planCode: "free", provider: "manual", status: "active" });
}

export function listBillingHistory({ workspaceId }) {
  const db = getDb();
  const events = db.prepare("SELECT * FROM billing_events WHERE workspace_id=? ORDER BY id DESC LIMIT 50").all(workspaceId);
  const invoices = db.prepare("SELECT * FROM invoices WHERE workspace_id=? ORDER BY id DESC LIMIT 50").all(workspaceId);
  return { events, invoices };
}
