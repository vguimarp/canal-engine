import { NextResponse } from "next/server";
import { getDb, batchWrite } from "@/lib/db";
import { researchTrends, generateIdeas, generateKeywords } from "@/lib/skills";
import { resolveBodyChannel } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { checkUsageLimit } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Fazer tudo": pesquisa tendências, gera ideias e monta SEO numa tacada.
// Escreve em LOTE (rápido no Turso) em vez de linha-a-linha (~35s antes).
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const resolved = resolveBodyChannel(body, { required: true });
  if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const channelId = resolved.channelId;
  const session = getSession();
  const limit = checkUsageLimit({
    workspaceId: resolved.workspaceId,
    userId: session?.uid ?? null,
    metric: "ideas",
    increment: 15,
  });
  if (!limit.allowed) return NextResponse.json({ error: limit.message, billing: limit.status }, { status: 402 });
  const db = getDb();
  const channel = db.prepare("SELECT niche FROM channels WHERE id=?").get(channelId);
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  const stmts = [];

  // 1) Tendências
  const trends = researchTrends(channel.niche, 10);
  const sqlT = `INSERT INTO trends
    (channel_id, topic, source, views_potential, retention_pot, production_ease, monetization, score)
    VALUES (?,?,?,?,?,?,?,?)`;
  for (const t of trends) stmts.push({ sql: sqlT, args: [channelId, t.topic, t.source, t.views, t.retention, t.ease, t.monetization, t.score] });

  // 2) Ideias
  const topics = trends.map((t) => t.topic);
  const ideas = generateIdeas(channel.niche, topics, { longCount: 5, shortCount: 10 });
  const sqlI = `INSERT INTO ideas
    (channel_id, format, topic, angle, originality, views_potential, score, status)
    VALUES (?,?,?,?,?,?,?,?)`;
  for (const i of ideas) stmts.push({ sql: sqlI, args: [channelId, i.format, i.topic, i.angle, i.originality, i.views_potential, i.score, "idea"] });

  // 3) SEO
  const kws = generateKeywords(topics.slice(0, 6));
  const sqlK = `INSERT INTO keywords
    (channel_id, video_id, keyword, intent, search_volume, competition, difficulty, potential, trend, opportunity)
    VALUES (?,NULL,?,?,?,?,?,?,?,?)`;
  for (const k of kws) stmts.push({ sql: sqlK, args: [channelId, k.keyword, k.intent, k.search_volume, k.competition, k.difficulty, k.potential, k.trend, k.opportunity] });

  try {
    await batchWrite(stmts);
  } catch (e) {
    return NextResponse.json({ error: "Falha ao gravar: " + (e?.message || e) }, { status: 500 });
  }

  return NextResponse.json({
    trends: trends.length,
    ideas: ideas.length,
    flagged: ideas.filter((i) => i.flagged).length,
    keywords: kws.length,
  });
}
