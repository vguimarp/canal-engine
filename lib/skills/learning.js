// ============================================================
// SKILL: Aprendizado / Memória (Tarefa 8)
// Analisa métricas registradas e extrai padrões vencedores.
// É a "memória permanente": com o tempo, identifica o que funciona
// (CTR, retenção, views, inscritos) e recomenda repetir.
//
// >>> ONDE PLUGAR API REAL <<<
// Alimente metrics[] com dados reais do YouTube Analytics API.
// A lógica de extração de padrões abaixo já funciona com dados reais.
// ============================================================

// Recebe linhas de métricas + os vídeos correspondentes e retorna
// aprendizados acionáveis com nível de confiança.
export function extractLearnings(videosWithMetrics) {
  const learnings = [];
  if (!videosWithMetrics.length) return learnings;

  const avg = (arr, key) => arr.reduce((s, v) => s + (v[key] || 0), 0) / arr.length;

  // Padrão 1: títulos com número performam melhor?
  const withNumber = videosWithMetrics.filter((v) => /\d/.test(v.title || ""));
  const without = videosWithMetrics.filter((v) => !/\d/.test(v.title || ""));
  if (withNumber.length >= 3 && without.length >= 3) {
    const a = avg(withNumber, "ctr"), b = avg(without, "ctr");
    if (a > b) {
      learnings.push({
        pattern: "Títulos com número tendem a ter CTR maior",
        evidence: `CTR médio ${a.toFixed(1)}% (com número) vs ${b.toFixed(1)}% (sem)`,
        confidence: Math.min(90, Math.round((a - b) * 10) + 40),
      });
    }
  }

  // Padrão 2: qual formato retém mais?
  const longs = videosWithMetrics.filter((v) => v.format === "long");
  const shorts = videosWithMetrics.filter((v) => v.format === "short");
  if (longs.length >= 3 && shorts.length >= 3) {
    const la = avg(longs, "retention"), sa = avg(shorts, "retention");
    learnings.push({
      pattern: `Formato com melhor retenção: ${la > sa ? "longo" : "short"}`,
      evidence: `Retenção média long ${la.toFixed(1)}% vs short ${sa.toFixed(1)}%`,
      confidence: 60,
    });
  }

  // Padrão 3: top tema por inscritos ganhos
  const byTopic = {};
  for (const v of videosWithMetrics) {
    const t = v.topic || "(sem tema)";
    byTopic[t] = (byTopic[t] || 0) + (v.subs_gained || 0);
  }
  const top = Object.entries(byTopic).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    learnings.push({
      pattern: `Tema que mais converte inscritos: "${top[0]}"`,
      evidence: `${top[1]} inscritos ganhos acumulados`,
      confidence: 70,
    });
  }

  return learnings;
}
