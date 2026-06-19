import { NextResponse } from "next/server";
import { fullHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = fullHealth();
  health.ok = health.database.ok && health.monitoring.ok;
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
