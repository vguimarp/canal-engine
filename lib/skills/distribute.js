// ============================================================
// SKILL: Distribuição Multiplataforma
// "Produzir uma vez → adaptar para todas as plataformas."
// Gera, por plataforma: título, legenda, hashtags, CTA, checklist e formato.
// 100% local — sem APIs externas.
// ============================================================

import { PLATFORMS, PLATFORM_TEMPLATES } from "./templates.js";
import { slugify } from "./_shared.js";

function clamp(text, max) {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
}

// Recebe o vídeo (com title/topic/angle) e, opcionalmente, o pacote SEO.
export function generateDistribution(video, seo = null) {
  const topic = video.topic || video.title || "o tema";
  const title = (seo && seo.mainTitle) || video.title || topic;
  const baseHashtags = (seo && seo.hashtags) || [`#${slugify(topic).replace(/-/g, "")}`];
  const angle = video.angle || video.variation_note || "";

  return PLATFORMS.map((p) => {
    const tpl = PLATFORM_TEMPLATES[p.key] || { cta: "", hashtags: [], checklist: [] };
    const hashtags = dedupe([...(tpl.hashtags || []), ...baseHashtags]).slice(0, p.kind === "short" ? 5 : 8);

    // Título adaptado ao tamanho/estilo da plataforma.
    const adaptedTitle = p.kind === "short"
      ? clamp(shortHook(topic), 60)
      : clamp(title, 100);

    // Legenda adaptada.
    const caption = p.kind === "post"
      ? clamp(`${title}. ${angle}\n\n${tpl.cta}`, p.maxLen)
      : clamp(`${adaptedTitle}\n${tpl.cta}`, p.maxLen);

    return {
      platform: p.key,
      platform_label: p.label,
      format: `${p.kind} · ${p.ratio}`,
      title: adaptedTitle,
      caption,
      hashtags,
      cta: tpl.cta,
      checklist: tpl.checklist || [],
    };
  });
}

function shortHook(topic) {
  return `Você sabia disto sobre ${topic}?`;
}

function dedupe(arr) { return [...new Set(arr.filter(Boolean))]; }
