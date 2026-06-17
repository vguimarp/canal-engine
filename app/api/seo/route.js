import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getKeywords, getKeywordsForVideo, getSeoPackage } from "@/lib/queries";
import { generateKeywords } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = Number(sp.get("channelId") || sp.get("channel") || 1);
  const videoId = sp.get("videoId");

  // Pacote de SEO de um vídeo específico + suas keywords.
  if (videoId) {
    const pkg = getSeoPackage(Number(videoId));
    if (!pkg) return NextResponse.json({ error: "Vídeo sem pacote SEO" }, { status: 404 });
    return NextResponse.json({ package: pkg, keywords: getKeywordsForVideo(Number(videoId)) });
  }

  // Pool de keywords do canal.
  return NextResponse.json(getKeywords(channelId));
}

// Gera/repõe o pool de keywords do canal (heurística local).
export async function POST(request) {
  const { channelId = 1 } = await request.json().catch(() => ({}));
  const db = getDb();
  const topics = db.prepare("SELECT DISTINCT topic FROM ideas WHERE channel_id=? LIMIT 6")
    .all(channelId).map((r) => r.topic);
  if (!topics.length) return NextResponse.json({ error: "Sem temas para SEO." }, { status: 400 });
  const kws = generateKeywords(topics);
  const ins = db.prepare(`INSERT INTO keywords
    (channel_id, video_id, keyword, intent, search_volume, competition, difficulty, potential, trend, opportunity)
    VALUES (?,NULL,?,?,?,?,?,?,?,?)`);
  const tx = db.transaction((rows) => rows.forEach((k) =>
    ins.run(channelId, k.keyword, k.intent, k.search_volume, k.competition, k.difficulty, k.potential, k.trend, k.opportunity)));
  tx(kws);
  return NextResponse.json({ created: kws.length });
}
