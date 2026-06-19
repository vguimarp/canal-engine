import { NextResponse } from "next/server";
import { getQueues, getQueueSummary } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json({ summary: [], items: [] });
  return NextResponse.json({ summary: getQueueSummary(resolved.channelId), items: getQueues(resolved.channelId) });
}
