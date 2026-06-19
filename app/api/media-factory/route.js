import { NextResponse } from "next/server";
import { generateMediaFactoryForVideo, getMediaFactoryOverview, getVideoById } from "@/lib/queries";
import { resolveChannelId, videoBelongsToWorkspace } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json({ summary: {}, assets: [], groups: {} });
  return NextResponse.json(getMediaFactoryOverview(resolved.channelId));
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const videoId = Number(body.videoId);
  if (!videoId) return NextResponse.json({ error: "videoId é obrigatório" }, { status: 400 });
  if (!videoBelongsToWorkspace(videoId)) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  const video = getVideoById(videoId);
  const channelId = video.channel_id;
  const result = generateMediaFactoryForVideo(channelId, videoId);
  if (!result) return NextResponse.json({ error: "Vídeo não encontrado neste canal" }, { status: 404 });
  if (result.error) return NextResponse.json(result, { status: 409 });
  return NextResponse.json(result, { status: 201 });
}
