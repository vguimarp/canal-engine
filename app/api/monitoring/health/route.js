import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/monitoring";
import { aiStatus } from "@/lib/aiProvider";
import { billingConfigStatus } from "@/lib/billingProviders";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ...getSystemHealth(),
    ai: aiStatus(),
    billing: billingConfigStatus(),
    timestamp: new Date().toISOString(),
  });
}
