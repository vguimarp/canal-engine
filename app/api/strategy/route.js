import { NextResponse } from "next/server";
import { getStrategy } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json([]);
  return NextResponse.json(getStrategy(resolved.channelId));
}
