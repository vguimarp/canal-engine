import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { researchTrends } from "@/lib/skills";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const channelId = (()=>{const sp=new URL(request.url).searchParams;return Number(sp.get("channelId")||sp.get("channel")||1);})();
  const rows = getDb().prepare("SELECT * FROM trends WHERE channel_id=? ORDER BY score DESC").all(channelId);
  return NextResponse.json(rows);
}

// Pesquisa tendências e grava (Tarefa 1).
export async function POST(request) {
  const { channelId = 1, count = 10 } = await request.json().catch(() => ({}));
  const db = getDb();
  const channel = db.prepare("SELECT niche FROM channels WHERE id=?").get(channelId);
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  const trends = researchTrends(channel.niche, count);
  const ins = db.prepare(`INSERT INTO trends
    (channel_id, topic, source, views_potential, retention_pot, production_ease, monetization, score)
    VALUES (?,?,?,?,?,?,?,?)`);
  const tx = db.transaction((rows) => rows.forEach((t) =>
    ins.run(channelId, t.topic, t.source, t.views, t.retention, t.ease, t.monetization, t.score)));
  tx(trends);

  return NextResponse.json({ created: trends.length });
}
