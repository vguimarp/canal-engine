import { NextResponse } from "next/server";
import { getVideoById, getIdeaById, saveSeoPackage, getSeoPackage } from "@/lib/queries";
import { AIProvider } from "@/lib/aiProvider";
import { currentUserId, currentWorkspaceId, videoBelongsToWorkspace } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Gera (ou regenera) o pacote de SEO de um vídeo já produzido, sob demanda.
// Útil para vídeos antigos (ex.: criados pelo seed) que ainda não têm pacote.
export async function POST(request) {
  const { videoId } = await request.json().catch(() => ({}));
  if (!videoId) return NextResponse.json({ error: "videoId é obrigatório" }, { status: 400 });
  if (!videoBelongsToWorkspace(Number(videoId))) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });

  const video = getVideoById(Number(videoId));
  if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });

  // Reaproveita a ideia de origem (tópico/ângulo) quando existe; senão usa o título.
  const idea = video.idea_id ? getIdeaById(video.idea_id) : null;
  const base = idea || { topic: video.title, angle: video.variation_note || "", title: video.title };

  const ai = new AIProvider({ workspaceId: currentWorkspaceId(), userId: currentUserId(), channelId: video.channel_id });
  const seo = await ai.generateSEO(base, { title: video.title, description: video.description });
  saveSeoPackage(video.channel_id, video.id, seo);

  return NextResponse.json({ videoId: video.id, package: getSeoPackage(video.id) }, { status: 201 });
}
