import { NextResponse } from "next/server";
import { getAnalyticsChannels } from "@/lib/queries";
import { currentWorkspaceId, resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = sp.get("channelId") || sp.get("channel");
  if (channelId) {
    const resolved = resolveChannelId(request, { required: true });
    if (resolved.error) return NextResponse.json([]);
    return NextResponse.json(getAnalyticsChannels(resolved.channelId, resolved.workspaceId));
  }
  return NextResponse.json(getAnalyticsChannels(null, currentWorkspaceId()));
}
