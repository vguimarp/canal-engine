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
  const thumbnail = (result.thumbnails || []).find((item) => item.file_name) || result.thumbnails?.[0] || null;
  return NextResponse.json({
    ...result,
    preview: thumbnail ? {
      id: thumbnail.id,
      url: `/api/media/${thumbnail.id}`,
      downloadUrl: `/api/media/${thumbnail.id}?download=1`,
      fileName: thumbnail.file_name,
      filePath: thumbnail.file_path,
    } : null,
    exportUrl: `/api/export/${videoId}`,
  }, { status: 201 });
}
