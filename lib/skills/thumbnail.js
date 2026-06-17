// ============================================================
// SKILL: Thumbnails (Tarefa 9)
// Gera prompt de imagem, texto de overlay e ideia visual.
//
// >>> ONDE PLUGAR API REAL <<<
// Envie o campo `prompt` para um gerador de imagem (ex.: API de
// imagem da sua escolha). Use `overlay_text` na arte final.
// ============================================================

import { seeded, pick } from "./_shared.js";

const VISUAL_STYLES = [
  "iluminação dramática, alto contraste, foco no objeto central",
  "composição cinematográfica, profundidade, tom misterioso",
  "cores saturadas, expressão de surpresa, seta apontando o detalhe",
  "atmosfera sombria, névoa, ponto de luz único",
];

const OVERLAY_PATTERNS = [
  (t) => `O SEGREDO DE ${t.toUpperCase()}`,
  (t) => `ISTO MUDA TUDO`,
  (t) => `NINGUÉM EXPLICA`,
  (t) => `A VERDADE`,
];

export function generateThumbnail(video) {
  const rnd = seeded((video.title || "x").length + 31);
  const topic = video.topic || video.title || "tema";
  const style = pick(VISUAL_STYLES, rnd);
  return {
    prompt:
      `Thumbnail de YouTube sobre "${topic}". Estilo: ${style}. ` +
      `Imagem ORIGINAL (não usar fotos protegidas por direitos autorais). ` +
      `Sem texto na imagem (o texto entra no overlay). Proporção 16:9, 1280x720.`,
    overlay_text: pick(OVERLAY_PATTERNS, rnd)(topic),
    visual_idea: `[INPUT HUMANO: ajuste expressão/elemento central para refletir o ângulo: ${video.angle || ""}]`,
  };
}

// --- Thumbnail Engine (3 variações com emoção + CTR estimado + recomendação) ---

const EMOTIONS = [
  { key: "curiosidade", word: (t) => `O SEGREDO DE ${t.toUpperCase()}`, ctr: 7.5 },
  { key: "choque",      word: () => "ISTO MUDA TUDO",                    ctr: 8.5 },
  { key: "intriga",     word: () => "NINGUÉM EXPLICA",                   ctr: 6.8 },
  { key: "urgência",    word: () => "A VERDADE REVELADA",               ctr: 7.0 },
];

// CTR estimado (heurístico): emoção forte + texto curto (3-4 palavras) sobem o CTR.
function estimateCtr(baseCtr, text) {
  const words = text.trim().split(/\s+/).length;
  const lengthBonus = words <= 4 ? 1.2 : words <= 6 ? 0 : -1.0;
  return Number(Math.max(2, Math.min(12, baseCtr + lengthBonus)).toFixed(1));
}

export function generateThumbnailSet(video) {
  const rnd = seeded((video.title || "x").length + 53);
  const topic = video.topic || video.title || "tema";
  const chosen = [EMOTIONS[1], EMOTIONS[0], EMOTIONS[2]]; // choque, curiosidade, intriga

  const variants = chosen.map((emo, i) => {
    const style = pick(VISUAL_STYLES, rnd);
    const mainText = emo.word(topic);
    const altText = EMOTIONS[(EMOTIONS.indexOf(emo) + 1) % EMOTIONS.length].word(topic);
    return {
      variant: i + 1,
      main_text: mainText,
      alt_text: altText,
      emotion: emo.key,
      prompt:
        `Thumbnail 16:9 (1280x720) sobre "${topic}". Emoção dominante: ${emo.key}. ` +
        `Estilo: ${style}. Rosto/elemento central expressivo, alto contraste, ORIGINAL ` +
        `(sem imagens protegidas). Texto entra como overlay, não na imagem.`,
      ctr_estimate: estimateCtr(emo.ctr, mainText),
      recommended: false,
    };
  });

  // Recomenda a de maior CTR estimado.
  const best = variants.reduce((a, b) => (b.ctr_estimate > a.ctr_estimate ? b : a), variants[0]);
  best.recommended = true;

  return { variants, recommendedVariant: best.variant, recommendedCtr: best.ctr_estimate };
}
