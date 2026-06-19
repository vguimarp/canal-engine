import { NextResponse } from "next/server";
import { processBillingWebhook, verifyWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const result = processBillingWebhook({
    provider: "mercado_pago",
    payload,
    verified: verifyWebhook("mercado_pago", request, JSON.stringify(payload)),
  });
  return NextResponse.json(result);
}
