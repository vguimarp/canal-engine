import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getIdeas, setIdeaStatus, getProducibleIdeas } from "@/lib/queries";
import { generateIdeas } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = Number(sp.get("channelId") || sp.get("channel") || 1);
  if (sp.get("producible")) return NextResponse.json(getProducibleIdeas(channelId));
  const format = sp.get("format"); // 'long' | 'short' | null
  return NextResponse.json(getIdeas(channelId, format));
}

// Gera novas ideias a partir das tendências do canal (Tarefa 2).
export async function POST(request) {
  const { channelId = 1, longCount = 5, shortCount = 10 } = await request.json().catch(() => ({}));
  const db = getDb();
  const channel = db.prepare("SELECT niche FROM channels WHERE id=?").get(channelId);
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  const topics = db.prepare("SELECT topic FROM trends WHERE channel_id=? ORDER BY score DESC LIMIT 15")
    .all(channelId).map((r) => r.topic);
  if (!topics.length) return NextResponse.json({ error: "Sem tendências. Gere tendências primeiro." }, { status: 400 });

  const ideas = generateIdeas(channel.niche, topics, { longCount, shortCount });
  const ins = db.prepare(`INSERT INTO ideas
    (channel_id, format, topic, angle, originality, views_potential, score, status)
    VALUES (?,?,?,?,?,?,?,?)`);
  const tx = db.transaction((rows) => rows.forEach((i) =>
    ins.run(channelId, i.format, i.topic, i.angle, i.originality, i.views_potential, i.score, "idea")));
  tx(ideas);

  return NextResponse.json({ created: ideas.length, flagged: ideas.filter((i) => i.flagged).length });
}

// Atualiza o status de uma ideia: idea → approved → produced, ou rejected (Fase 1).
export async function PATCH(request) {
  const { id, status } = await request.json().catch(() => ({}));
  if (!id || !status) return NextResponse.json({ error: "id e status são obrigatórios" }, { status: 400 });

  const result = setIdeaStatus(Number(id), status);
  if (result === null) return NextResponse.json({ error: "Ideia não encontrada" }, { status: 404 });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
