import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json({ error: resolved.error, empty: true }, { status: resolved.status });
  return NextResponse.json(getDashboard(resolved.channelId, resolved.workspaceId));
}
