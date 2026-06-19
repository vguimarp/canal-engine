import { NextResponse } from "next/server";
import { getAnalyticsMonetization } from "@/lib/queries";
import { currentWorkspaceId, resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = sp.get("channelId") || sp.get("channel");
  if (channelId) {
    const resolved = resolveChannelId(request, { required: true });
    if (resolved.error) return NextResponse.json(getAnalyticsMonetization(null, currentWorkspaceId()));
    return NextResponse.json(getAnalyticsMonetization(resolved.channelId, resolved.workspaceId));
  }
  return NextResponse.json(getAnalyticsMonetization(null, currentWorkspaceId()));
}
