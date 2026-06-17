import { NextResponse } from "next/server";
import { getExecutionHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const limit = Math.max(1, Math.min(50, Number(sp.get("limit") || 20)));
  return NextResponse.json(getExecutionHistory(limit));
}
