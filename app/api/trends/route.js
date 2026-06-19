import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { AIProvider } from "@/lib/aiProvider";
import { currentUserId, resolveBodyChannel, resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json([]);
  const rows = getDb().prepare("SELECT * FROM trends WHERE channel_id=? ORDER BY score DESC").all(resolved.channelId);
  return NextResponse.json(rows);
}

// Pesquisa tendências e grava (Tarefa 1).
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { count = 10 } = body;
  const resolved = resolveBodyChannel(body, { required: true });
  if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const channelId = resolved.channelId;
  const db = getDb();
  const channel = db.prepare("SELECT niche FROM channels WHERE id=?").get(channelId);
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  const ai = new AIProvider({ workspaceId: resolved.workspaceId, userId: currentUserId(), channelId });
  const trends = await ai.generateTrends(channel.niche, count);
  const ins = db.prepare(`INSERT INTO trends
    (channel_id, topic, source, views_potential, retention_pot, production_ease, monetization, score)
    VALUES (?,?,?,?,?,?,?,?)`);
  const tx = db.transaction((rows) => rows.forEach((t) =>
    ins.run(channelId, t.topic, t.source, t.views, t.retention, t.ease, t.monetization, t.score)));
  tx(trends);

  return NextResponse.json({ created: trends.length });
}
