import { NextResponse } from "next/server";
import { getCalendar } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const platform = sp.get("platform");
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json([]);
  return NextResponse.json(getCalendar(resolved.channelId, platform));
}
