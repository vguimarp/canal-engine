// ============================================================
// SKILL: Analytics & Monetization Engine
// Scores relativos para decidir onde produzir, melhorar e priorizar.
// Nao promete receita: usa potencial, ranking e prioridade.
// ============================================================

import { channelMonetizationPotential, nicheRpm, priorityLabel } from "./monetization.js";

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, Number(n || 0)));
const round = (n, d = 1) => Number(clamp(n).toFixed(d));

export function productionScore({ longVideos = 0, shorts = 0, posts = 0, produced = 0, ideas = 0 } = {}) {
  const volume = Math.min(100, longVideos * 7 + shorts * 1.5 + posts * 0.5);
  const execution = ideas > 0 ? Math.min(100, (produced / ideas) * 100) : 0;
  return round(volume * 0.65 + execution * 0.35);
}

export function consistencyScore({ longVideos = 0, publishedVideos = 0, posting_frequency = "" } = {}) {
  const planned = /(\d+)/.exec(posting_frequency || "");
  const weeklyTarget = planned ? Math.max(1, Number(planned[1])) : 1;
  const execution = Math.min(100, (longVideos / Math.max(4, weeklyTarget * 4)) * 100);
  const publication = longVideos > 0 ? Math.min(100, (publishedVideos / longVideos) * 100) : 0;
  return round(execution * 0.6 + publication * 0.4);
}

export function growthScore({ views = 0, subs = 0, avgCtr = 0, avgRetention = 0 } = {}) {
  const viewScore = Math.min(100, Math.log10(Math.max(1, views)) * 20);
  const subScore = Math.min(100, Math.log10(Math.max(1, subs + 1)) * 28);
  const ctrScore = Math.min(100, avgCtr * 10);
  const retentionScore = clamp(avgRetention);
  return round(viewScore * 0.3 + subScore * 0.25 + ctrScore * 0.2 + retentionScore * 0.25);
}

export function channelScore(input = {}) {
  const growth = growthScore(input);
  const seo = clamp(input.avgSeoScore || input.avgKeywordOpportunity || 0);
  const production = productionScore(input);
  const originality = clamp(input.avgOriginality || 0);
  const consistency = consistencyScore(input);
  const monetization = channelMonetizationPotential(
    { longVideos: input.longVideos || 0, avgScore: input.avgIdeaScore || 0 },
    input.niche
  );
  const total = round(
    growth * 0.18 +
    seo * 0.16 +
    production * 0.18 +
    originality * 0.16 +
    consistency * 0.14 +
    monetization * 0.18
  );
  return {
    total,
    growth,
    seo: round(seo),
    production,
    originality: round(originality),
    consistency,
    monetization,
    priority: priorityLabel(total),
  };
}

export function nicheScore(input = {}) {
  const rpmScore = Math.min(100, (nicheRpm(input.niche) / 18) * 100);
  const potential = round((input.avgTrendScore || input.avgIdeaScore || 0) * 0.45 + rpmScore * 0.35 + (input.avgSeoPotential || 0) * 0.2);
  const competition = round(input.avgCompetition ?? input.avgDifficulty ?? 50);
  const monetization = round(rpmScore * 0.7 + potential * 0.3);
  const difficulty = round(competition * 0.65 + (100 - (input.avgProductionEase || 50)) * 0.35);
  const total = round(potential * 0.35 + (100 - difficulty) * 0.2 + monetization * 0.3 + (100 - competition) * 0.15);
  return { total, potential, competition, monetization, difficulty, priority: priorityLabel(total) };
}

export function contentScore(input = {}) {
  const seo = clamp(input.seoScore || input.keywordPotential || 0);
  const viral = round((input.viewsPotential || 0) * 0.45 + (input.viewsScore || 0) * 0.35 + (input.ctrScore || 0) * 0.2);
  const retention = round((input.retention || input.retentionPotential || 0));
  const monetization = round((input.monetization || 0) * 0.55 + (input.viewsPotential || 0) * 0.25 + seo * 0.2);
  const originality = clamp(input.originality || 0);
  const total = round(seo * 0.22 + viral * 0.24 + retention * 0.2 + monetization * 0.2 + originality * 0.14);
  return { total, seo: round(seo), viral, retention, monetization, originality, priority: priorityDecision(total, originality) };
}

export function priorityDecision(score = 0, originality = 100) {
  if (originality < 40 || score < 35) return "Arquivar";
  if (score >= 68) return "Produzir agora";
  return "Produzir depois";
}

export function opportunityType(score = 0) {
  if (score >= 75) return "alta";
  if (score >= 55) return "media";
  return "baixa";
}
