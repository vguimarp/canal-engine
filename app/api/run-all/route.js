import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { researchTrends, generateIdeas, generateKeywords } from "@/lib/skills";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Fazer tudo": pesquisa tendências, gera ideias e monta SEO numa tacada.
// Pensado para o usuário iniciante — um clique faz o ciclo completo.
export async function POST(request) {
  const { channelId = 1 } = await request.json().catch(() => ({}));
  const db = getDb();
  const channel = db.prepare("SELECT niche FROM channels WHERE id=?").get(channelId);
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  // 1) Tendências
  const trends = researchTrends(channel.niche, 10);
  const insT = db.prepare(`INSERT INTO trends
    (channel_id, topic, source, views_potential, retention_pot, production_ease, monetization, score)
    VALUES (?,?,?,?,?,?,?,?)`);
  db.transaction((rows) => rows.forEach((t) =>
    insT.run(channelId, t.topic, t.source, t.views, t.retention, t.ease, t.monetization, t.score)))(trends);

  // 2) Ideias
  const topics = trends.map((t) => t.topic);
  const ideas = generateIdeas(channel.niche, topics, { longCount: 5, shortCount: 10 });
  const insI = db.prepare(`INSERT INTO ideas
    (channel_id, format, topic, angle, originality, views_potential, score, status)
    VALUES (?,?,?,?,?,?,?,?)`);
  db.transaction((rows) => rows.forEach((i) =>
    insI.run(channelId, i.format, i.topic, i.angle, i.originality, i.views_potential, i.score, "idea")))(ideas);

  // 3) SEO
  const kws = generateKeywords(topics.slice(0, 6));
  const insK = db.prepare(`INSERT INTO keywords
    (channel_id, video_id, keyword, intent, search_volume, competition, difficulty, potential, trend, opportunity)
    VALUES (?,NULL,?,?,?,?,?,?,?,?)`);
  db.transaction((rows) => rows.forEach((k) =>
    insK.run(channelId, k.keyword, k.intent, k.search_volume, k.competition, k.difficulty, k.potential, k.trend, k.opportunity)))(kws);

  return NextResponse.json({
    trends: trends.length,
    ideas: ideas.length,
    flagged: ideas.filter((i) => i.flagged).length,
    keywords: kws.length,
  });
}
