import { NextResponse } from "next/server";
import { BILLING_PROVIDERS, PLAN_DEFS, recordBillingEvent } from "@/lib/billing";
import { currentUserId, currentWorkspaceId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const planCode = String(body.planCode || "").toLowerCase().trim();
  const provider = String(body.provider || "stripe").toLowerCase().trim();
  if (!PLAN_DEFS.some((p) => p.code === planCode && p.code !== "free")) {
    return NextResponse.json({ error: "Escolha um plano pago válido." }, { status: 400 });
  }
  if (!BILLING_PROVIDERS.some((p) => p.code === provider)) {
    return NextResponse.json({ error: "Gateway de pagamento não reconhecido." }, { status: 400 });
  }

  const event = recordBillingEvent({
    workspaceId: currentWorkspaceId(),
    userId: currentUserId(),
    provider,
    eventType: "checkout_requested",
    planCode,
    payload: {
      source: "dashboard",
      note: "Gateway preparado; integração real pendente.",
    },
  });

  return NextResponse.json({
    ok: true,
    checkoutReady: false,
    event,
    message: "Upgrade registrado. A conexão com o gateway de pagamento ainda precisa ser ativada.",
  }, { status: 202 });
}
