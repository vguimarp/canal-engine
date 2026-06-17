import { NextResponse } from "next/server";
import { getCalendar } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = Number(sp.get("channelId") || sp.get("channel") || 1);
  const platform = sp.get("platform");
  return NextResponse.json(getCalendar(channelId, platform));
}
