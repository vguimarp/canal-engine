import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const channelId = (()=>{const sp=new URL(request.url).searchParams;return Number(sp.get("channelId")||sp.get("channel")||1);})();
  return NextResponse.json(getDashboard(channelId));
}
