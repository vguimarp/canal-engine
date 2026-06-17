// ============================================================
// SKILL: SEO Profissional (Tarefa 6)
// Gera palavras-chave e PACOTES DE SEO completos por vídeo usando
// heurísticas locais — sem nenhuma API paga. A arquitetura está pronta
// para, no futuro, trocar as heurísticas por dados reais.
//
// >>> ONDE PLUGAR API REAL <<<
// Substitua estimateVolume()/estimateCompetition() por dados de:
// YouTube autosuggest, Google Keyword Planner, Ahrefs/Semrush, VidIQ.
// As funções de intent/difficulty/potential/score continuam válidas.
// ============================================================

import { seoOpportunity, seeded, slugify } from "./_shared.js";

const MODIFIERS = ["o que aconteceu com", "a verdade sobre", "história de", "mistério de", "por que", "documentário"];
const TRENDS = ["up", "flat", "down"];

// --- Classificação de intenção de busca (heurística por padrão textual) ---
export function classifyIntent(keyword) {
  const k = keyword.toLowerCase();
  if (/(como|passo a passo|tutorial|guia)/.test(k)) return "howto";
  if (/(o que aconteceu|últim|notícia|recente|hoje|2024|2025|2026)/.test(k)) return "news";
  if (/(comprar|preço|melhor|review|vale a pena)/.test(k)) return "commercial";
  if (/(mistério|verdade|segredo|por que|por que|curiosidade|inexplicável)/.test(k)) return "curiosity";
  return "informational";
}

// Dificuldade estimada 0-100: termos curtos e genéricos são mais disputados;
// termos longos (long-tail) são mais fáceis. Competição entra com peso.
export function estimateDifficulty(keyword, competition = null) {
  const words = keyword.trim().split(/\s+/).length;
  const lengthEase = Math.max(0, 40 - words * 6); // mais palavras → menos difícil
  const comp = competition == null ? 50 : competition;
  return Number(Math.min(100, Math.max(0, comp * 0.7 + lengthEase)).toFixed(1));
}

// Potencial de busca 0-100: combina volume (log) e tendência.
export function estimatePotential(volume = 0, trend = "flat") {
  const volScore = Math.min(100, Math.log10(Math.max(1, volume)) * 22);
  const trendBoost = trend === "up" ? 12 : trend === "down" ? -12 : 0;
  return Number(Math.min(100, Math.max(0, volScore + trendBoost)).toFixed(1));
}

// Score SEO consolidado 0-100: alto potencial e baixa dificuldade = melhor.
export function seoScore(potential = 0, difficulty = 0) {
  return Number(Math.min(100, Math.max(0, potential * 0.7 + (100 - difficulty) * 0.3)).toFixed(1));
}

// Enriquece uma keyword "crua" com todos os sinais de SEO.
function enrichKeyword(keyword, rnd) {
  const volume = Math.round(rnd() * 50000);
  const competition = Math.round(rnd() * 100);
  const trend = TRENDS[Math.floor(rnd() * TRENDS.length)];
  const intent = classifyIntent(keyword);
  const difficulty = estimateDifficulty(keyword, competition);
  const potential = estimatePotential(volume, trend);
  return {
    keyword,
    intent,
    search_volume: volume,
    competition,
    trend,
    difficulty,
    potential,
    opportunity: seoOpportunity(volume, competition),
    score: seoScore(potential, difficulty),
  };
}

// Pool de keywords do canal (várias por tópico). Mantém o retorno anterior
// + novos campos (intent/difficulty/potential/score) — compatível.
export function generateKeywords(topics) {
  const rnd = seeded(topics.join("").length + 21);
  const out = [];
  for (const topic of topics) {
    for (const mod of MODIFIERS) {
      out.push(enrichKeyword(`${mod} ${topic}`, rnd));
    }
  }
  return out.sort((a, b) => b.opportunity - a.opportunity);
}

// --- Pacote de SEO por vídeo ---

const TITLE_TEMPLATES = [
  (t) => `${capitalize(t)}: a verdade que poucos conhecem`,
  (t) => `O mistério de ${t} finalmente explicado`,
  (t) => `${capitalize(t)} — o que descobriram muda tudo`,
  (t) => `Por que ${t} ainda intriga especialistas`,
  (t) => `${capitalize(t)}: a investigação completa`,
  (t) => `O lado oculto de ${t}`,
];

function capitalize(s = "") { return s.charAt(0).toUpperCase() + s.slice(1); }

// Gera o pacote completo de SEO a partir da ideia (e, opcionalmente, do
// pacote de roteiro já existente, para reaproveitar título/tags).
export function buildSeoPackage(idea, pkg = {}) {
  const topic = idea.topic || idea.title || "tema";
  const rnd = seeded(slugify(topic).length + 41);

  // Keywords principais derivadas do tópico (long-tail + intenção variada).
  const seeds = [
    topic,
    `o que aconteceu com ${topic}`,
    `a verdade sobre ${topic}`,
    `história de ${topic}`,
    `mistério de ${topic}`,
    `por que ${topic} aconteceu`,
    `documentário ${topic}`,
    `como entender ${topic}`,
  ];
  const keywords = seeds.map((k) => enrichKeyword(k, rnd))
    .sort((a, b) => b.score - a.score);

  const difficulty = avg(keywords.map((k) => k.difficulty));
  const potential = avg(keywords.map((k) => k.potential));
  const score = seoScore(potential, difficulty);

  const mainTitle = pkg.title || TITLE_TEMPLATES[0](topic);
  const altTitles = TITLE_TEMPLATES.slice(0, 6)
    .map((fn) => fn(topic))
    .filter((t) => t !== mainTitle)
    .slice(0, 5);

  // Descrição otimizada: 1ª linha rica em keyword + bloco com keywords principais.
  const topKw = keywords.slice(0, 5).map((k) => k.keyword);
  const description =
    `${mainTitle}. ${idea.angle || ""}\n\n` +
    `Neste vídeo você vai entender ${topic} em profundidade. ` +
    `[INPUT HUMANO: adicione 2-3 frases pessoais sobre por que este tema importa]\n\n` +
    `🔎 Tópicos abordados: ${topKw.join(" · ")}.\n\n` +
    `Fontes e referências:\n[INPUT HUMANO: liste suas fontes — exigência de originalidade]\n\n` +
    `#${slugify(topic).replace(/-/g, "")} — Inscreva-se para mais investigações como esta.`;

  const tags = dedupe([
    topic,
    ...topic.split(" ").filter((w) => w.length > 3),
    ...keywords.slice(0, 6).map((k) => k.keyword),
    "curiosidades", "mistérios", "história", "fatos reais", "documentário",
  ]).slice(0, 15);

  const hashtags = dedupe([
    `#${slugify(topic).replace(/-/g, "")}`,
    "#curiosidades", "#misterios", "#documentario", "#fatosreais",
  ]).slice(0, 6);

  return {
    mainTitle,
    altTitles,
    description,
    tags,
    hashtags,
    keywords,        // [{keyword,intent,difficulty,potential,score,...}]
    difficulty,      // média 0-100
    potential,       // média 0-100
    seoScore: score, // consolidado 0-100
  };
}

function avg(arr) { return arr.length ? Number((arr.reduce((s, n) => s + n, 0) / arr.length).toFixed(1)) : 0; }
function dedupe(arr) { return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))]; }
