// ============================================================
// SKILL: Ideias (Tarefa 2)
// Gera ideias de vídeos long/short COM ângulo único e nota de
// originalidade — desenhada para evitar a política de "conteúdo
// inautêntico" do YouTube (jul/2025): nada de variações superficiais.
//
// >>> ONDE PLUGAR API REAL <<<
// Troque generateAngle() por uma chamada ao modelo de IA (ex.: a
// própria API da Anthropic) pedindo um ângulo genuinamente novo,
// e calcule originalidade comparando com seu banco de vídeos já feitos
// (embeddings + similaridade de cosseno).
// ============================================================

import { weightedScore, seeded, pick } from "./_shared.js";

// Ângulos que forçam diferenciação real (não cosmética).
const ANGLE_TEMPLATES = [
  (t) => `Investigação cronológica: a linha do tempo completa de ${t}`,
  (t) => `Contraponto: o que a versão popular sobre ${t} erra`,
  (t) => `Bastidores: quem realmente estava por trás de ${t}`,
  (t) => `Análise de evidências: o que os documentos revelam sobre ${t}`,
  (t) => `Consequências: o impacto de ${t} que ninguém acompanhou`,
  (t) => `Perspectiva local: ${t} contada por quem viveu de perto`,
  (t) => `Ciência por trás: a explicação técnica de ${t}`,
  (t) => `Comparação: ${t} versus casos semelhantes esquecidos`,
];

function generateAngle(topic, rnd) {
  return pick(ANGLE_TEMPLATES, rnd)(topic);
}

// Originalidade: penaliza repetição de tópico já usado. Em produção,
// use similaridade semântica contra o banco real de vídeos.
function originalityScore(topic, usedTopics, rnd) {
  const repeated = usedTopics.filter((x) => x === topic).length;
  const base = 70 + Math.round(rnd() * 30);
  return Math.max(20, base - repeated * 15);
}

export function generateIdeas(niche, topics, { longCount = 10, shortCount = 20 } = {}) {
  const rnd = seeded((Date.now() % 99999) + topics.length);
  const used = [];
  const make = (format, count) =>
    Array.from({ length: count }, () => {
      const topic = pick(topics, rnd);
      used.push(topic);
      const angle = generateAngle(topic, rnd);
      const originality = originalityScore(topic, used, rnd);
      const views = Math.round(40 + rnd() * 60);
      const retention = Math.round(40 + rnd() * 60);
      const score = weightedScore({ views, retention, ease: 60, monetization: 60 });
      return {
        format, topic, angle, originality,
        views_potential: views,
        // ideias pouco originais entram com score reduzido (sinal de alerta)
        score: originality < 50 ? Number((score * 0.6).toFixed(1)) : score,
        flagged: originality < 50,
      };
    });

  return [...make("long", longCount), ...make("short", shortCount)]
    .sort((a, b) => b.score - a.score);
}
