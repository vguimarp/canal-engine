import { NextResponse } from "next/server";
import { billingConfigStatus } from "@/lib/billingProviders";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(billingConfigStatus());
}
