import { NextResponse } from "next/server";
import { processBillingWebhook, verifyWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const raw = await request.text();
  const payload = JSON.parse(raw || "{}");
  const result = processBillingWebhook({
    provider: "stripe",
    payload,
    verified: verifyWebhook("stripe", request, raw),
  });
  return NextResponse.json(result);
}
