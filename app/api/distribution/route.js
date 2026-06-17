import { NextResponse } from "next/server";
import { getVideoById, getIdeaById, getSeoPackage, getDistributions, getDistributionsForVideo, saveDistributions, updateDistribution } from "@/lib/queries";
import { generateDistribution } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const videoId = sp.get("videoId");
  if (videoId) return NextResponse.json(getDistributionsForVideo(Number(videoId)));
  const channelId = Number(sp.get("channelId") || sp.get("channel") || 1);
  return NextResponse.json(getDistributions(channelId));
}

// Gera os pacotes de distribuição multiplataforma de um vídeo.
export async function POST(request) {
  const { videoId } = await request.json().catch(() => ({}));
  const video = videoId && getVideoById(Number(videoId));
  if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  const idea = video.idea_id ? getIdeaById(video.idea_id) : null;
  const seo = getSeoPackage(video.id);
  const items = generateDistribution({ ...(idea || {}), title: video.title }, seo ? { mainTitle: seo.main_title, hashtags: seo.hashtags } : null);
  saveDistributions(video.channel_id, video.id, items);
  return NextResponse.json({ videoId: video.id, distributions: getDistributionsForVideo(video.id) }, { status: 201 });
}

// Atualiza status/agendamento de um item de distribuição.
export async function PATCH(request) {
  const { id, status, scheduled_at } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  const data = {};
  if (status !== undefined) data.status = status;
  if (scheduled_at !== undefined) data.scheduled_at = scheduled_at;
  const res = updateDistribution(Number(id), data);
  if (res === null) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  if (res.error) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
