import { NextResponse } from "next/server";
import { generateMediaFactoryForVideo, getMediaFactoryOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = Number(sp.get("channelId") || sp.get("channel") || 1);
  return NextResponse.json(getMediaFactoryOverview(channelId));
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const channelId = Number(body.channelId || body.channel || 1);
  const videoId = Number(body.videoId);
  if (!videoId) return NextResponse.json({ error: "videoId é obrigatório" }, { status: 400 });
  const result = generateMediaFactoryForVideo(channelId, videoId);
  if (!result) return NextResponse.json({ error: "Vídeo não encontrado neste canal" }, { status: 404 });
  if (result.error) return NextResponse.json(result, { status: 409 });
  return NextResponse.json(result, { status: 201 });
}
