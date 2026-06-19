import { NextResponse } from "next/server";
import { currentUserId, currentWorkspaceId } from "@/lib/tenant";
import { createCheckout } from "@/lib/billingProviders";
import { logEvent } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const planCode = String(body.planCode || "").toLowerCase().trim();
  const provider = String(body.provider || "stripe").toLowerCase().trim();
  const interval = String(body.interval || "monthly").toLowerCase().trim();
  const workspaceId = currentWorkspaceId();
  const userId = currentUserId();
  if (!userId) return NextResponse.json({ error: "Entre na sua conta para assinar um plano." }, { status: 401 });
  try {
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const checkout = await createCheckout({ workspaceId, userId, planCode, interval, provider, origin });
    return NextResponse.json(checkout, { status: checkout.checkoutReady ? 201 : 202 });
  } catch (error) {
    logEvent({ level: "error", source: "billing.checkout", message: error.message, workspaceId, userId, context: { planCode, provider, interval } });
    return NextResponse.json({ error: error.message || "Falha ao preparar checkout." }, { status: 400 });
  }
}
