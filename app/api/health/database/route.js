import { NextResponse } from "next/server";
import { databaseHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = databaseHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
