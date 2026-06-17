import { NextResponse } from "next/server";
import { getAnalyticsChannels } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = sp.get("channelId") || sp.get("channel");
  return NextResponse.json(getAnalyticsChannels(channelId ? Number(channelId) : null));
}
