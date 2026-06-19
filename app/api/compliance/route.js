import { NextResponse } from "next/server";
import { getChannelCompliance } from "@/lib/queries";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json({ summary: { seguro: 0, revisar: 0, altoRisco: 0 }, items: [] });
  return NextResponse.json(getChannelCompliance(resolved.channelId));
}
