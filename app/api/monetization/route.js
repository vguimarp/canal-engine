import { NextResponse } from "next/server";
import { getMonetization } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json({ topVideos: [], priorityVideos: [] });
  return NextResponse.json(getMonetization(resolved.channelId));
}
