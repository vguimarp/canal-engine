import { NextResponse } from "next/server";
import { databaseHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = databaseHealth({ deep: process.env.HEALTH_DEEP === "1" });
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
