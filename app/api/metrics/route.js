import { NextResponse } from "next/server";
import { getMetricsForLearning } from "@/lib/queries";
import { extractLearnings } from "@/lib/skills";

export const dynamic = "force-dynamic";

// Retorna aprendizados extraídos das métricas (Tarefa 8 — memória).
export async function GET(request) {
  const channelId = (()=>{const sp=new URL(request.url).searchParams;return Number(sp.get("channelId")||sp.get("channel")||1);})();
  const metrics = getMetricsForLearning(channelId);
  return NextResponse.json({ learnings: extractLearnings(metrics), sampleSize: metrics.length });
}
