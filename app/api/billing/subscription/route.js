import { NextResponse } from "next/server";
import { cancelSubscription, changeSubscription } from "@/lib/billingProviders";
import { currentUserId, currentWorkspaceId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const userId = currentUserId();
  const workspaceId = currentWorkspaceId();
  if (!userId) return NextResponse.json({ error: "Entre na sua conta para alterar o plano." }, { status: 401 });
  const action = String(body.action || "").toLowerCase();
  if (action === "cancel") {
    return NextResponse.json({ subscription: cancelSubscription({ workspaceId, userId }) });
  }
  const planCode = String(body.planCode || "").toLowerCase();
  if (!["free", "starter", "pro", "agency"].includes(planCode)) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }
  const adminSecret = process.env.BILLING_ADMIN_SECRET;
  const isInternal = adminSecret && request.headers.get("x-billing-admin-secret") === adminSecret;
  if (["starter", "pro", "agency"].includes(planCode) && !isInternal) {
    return NextResponse.json({ error: "Para ativar plano pago, use o checkout ou aguarde confirmação do pagamento." }, { status: 402 });
  }
  return NextResponse.json({
    subscription: changeSubscription({
      workspaceId,
      userId,
      planCode,
      provider: "manual",
      status: "active",
      interval: body.interval === "annual" ? "annual" : "monthly",
    }),
  });
}
