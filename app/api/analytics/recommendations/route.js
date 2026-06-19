import { NextResponse } from "next/server";
import { getAnalyticsRecommendations } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json({ actions: [], produceNow: [], produceLater: [], archive: [] });
  return NextResponse.json(getAnalyticsRecommendations(resolved.channelId, resolved.workspaceId));
}
