import { NextResponse } from "next/server";
import { getVideoById, getIdeaById, getThumbVariants, saveThumbVariants } from "@/lib/queries";
import { generateThumbnailSet } from "@/lib/skills";
import { videoBelongsToWorkspace } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const videoId = Number(new URL(request.url).searchParams.get("videoId"));
  if (!videoId) return NextResponse.json({ error: "videoId é obrigatório" }, { status: 400 });
  if (!videoBelongsToWorkspace(videoId)) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  return NextResponse.json(getThumbVariants(videoId));
}

// Gera (ou regenera) as 3 variações de thumbnail de um vídeo.
export async function POST(request) {
  const { videoId } = await request.json().catch(() => ({}));
  if (!videoBelongsToWorkspace(Number(videoId))) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  const video = videoId && getVideoById(Number(videoId));
  if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  const idea = video.idea_id ? getIdeaById(video.idea_id) : null;
  const set = generateThumbnailSet({ ...(idea || {}), title: video.title });
  saveThumbVariants(video.id, set);
  return NextResponse.json({ videoId: video.id, variants: getThumbVariants(video.id), recommended: set.recommendedVariant }, { status: 201 });
}
