import { NextResponse } from "next/server";
import { getAnalyticsOpportunities } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json([]);
  return NextResponse.json(getAnalyticsOpportunities(resolved.channelId, resolved.workspaceId));
}
