import { NextResponse } from "next/server";
import { getPlans } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ plans: getPlans() });
}
