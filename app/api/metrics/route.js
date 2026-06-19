import { NextResponse } from "next/server";
import { getMetricsForLearning } from "@/lib/queries";
import { extractLearnings } from "@/lib/skills";
import { resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Retorna aprendizados extraídos das métricas (Tarefa 8 — memória).
export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json({ learnings: [], sampleSize: 0 });
  const metrics = getMetricsForLearning(resolved.channelId);
  return NextResponse.json({ learnings: extractLearnings(metrics), sampleSize: metrics.length });
}
