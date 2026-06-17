// ============================================================
// SKILL: Compliance & Safety
// Verifica sinais de risco em um conteúdo e classifica:
//   "seguro" | "revisar" | "alto risco".
// Heurístico e local. NÃO garante proteção total — apenas alerta.
// ============================================================

const CLICKBAIT = ["você não vai acreditar", "chocante", "inacreditável", "100%", "garantido", "nunca visto", "proibido"];
const SENSITIVE = ["morte", "suicídio", "arma", "droga", "violência", "sangue", "guerra", "golpe", "fraude"];
const COPYRIGHT_HINTS = ["música original do artista", "trecho do filme", "cena oficial", "©"];

export function checkContent(input = {}) {
  const { title = "", description = "", hashtags = [], tags = [], originality = 100, overlay_text = "" } = input;
  const text = `${title} ${description} ${overlay_text}`.toLowerCase();
  const issues = [];

  const hashtagCount = (Array.isArray(hashtags) ? hashtags : []).length;
  if (hashtagCount > 15) issues.push({ type: "spam", severity: "alto", msg: `Excesso de hashtags (${hashtagCount}). Use até 10-15.` });
  else if (hashtagCount > 10) issues.push({ type: "hashtags", severity: "baixo", msg: "Muitas hashtags — pode parecer spam." });

  if (CLICKBAIT.some((w) => text.includes(w)))
    issues.push({ type: "titulo_enganoso", severity: "médio", msg: "Título/descrição com termos de clickbait — pode ser visto como enganoso." });

  if (/\b(o segredo|ninguém explica|isto muda tudo)\b/.test(overlay_text.toLowerCase()) && originality < 50)
    issues.push({ type: "thumbnail_enganosa", severity: "médio", msg: "Thumbnail sensacionalista com baixa originalidade — risco de promessa não cumprida." });

  const sensitiveHit = SENSITIVE.filter((w) => text.includes(w));
  if (sensitiveHit.length)
    issues.push({ type: "conteudo_sensivel", severity: "médio", msg: `Tema sensível detectado (${sensitiveHit.join(", ")}). Revise tom e contexto.` });

  if (COPYRIGHT_HINTS.some((w) => text.includes(w)))
    issues.push({ type: "copyright", severity: "alto", msg: "Possível material protegido por direitos autorais. Use conteúdo original." });

  if (originality < 40) issues.push({ type: "baixa_originalidade", severity: "alto", msg: `Originalidade muito baixa (${originality}). Risco de conteúdo inautêntico.` });
  else if (originality < 55) issues.push({ type: "baixa_originalidade", severity: "médio", msg: `Originalidade baixa (${originality}). Reforce ângulo próprio.` });

  // Possível fake news: afirmações absolutas sem fontes.
  if (/\b(comprovado|cientistas afirmam|estudo prova)\b/.test(text) && !text.includes("fonte"))
    issues.push({ type: "fake_news", severity: "médio", msg: "Afirmação forte sem citar fontes — adicione referências." });

  // Classificação a partir da pior severidade encontrada.
  const hasHigh = issues.some((i) => i.severity === "alto");
  const hasMed = issues.some((i) => i.severity === "médio");
  const level = hasHigh ? "alto risco" : hasMed ? "revisar" : "seguro";
  const score = Math.max(0, 100 - issues.reduce((s, i) => s + (i.severity === "alto" ? 35 : i.severity === "médio" ? 15 : 5), 0));

  return { level, score, issues };
}
