// ============================================================
// Autonomous Execution Engine
// Orquestra o ciclo completo sem publicar fora do sistema.
// ============================================================

import {
  addExecutionStep,
  createExecutionRun,
  enqueue,
  finishExecutionRun,
  generateMediaFactoryForVideo,
  getAnalyticsChannels,
  getAnalyticsContent,
  getChannelCompliance,
  getIdeaById,
  getPriorityRankings,
  getSeoPackage,
  getWeeklyFocus,
  produceVideoFromIdea,
  saveDistributions,
  setIdeaStatus,
  updateDistribution,
} from "./queries.js";
import {
  buildSeoPackage,
  generateDerivatives,
  generateDistribution,
  generatePackage,
  generateThumbnail,
  generateThumbnailSet,
} from "./skills/index.js";

const DEFAULT_LIMITS = {
  maxIdeas: 3,
  maxVideos: 2,
  maxShorts: 10,
  maxScheduledPosts: 14,
  platforms: ["youtube_shorts", "tiktok", "instagram_reels", "facebook_reels", "kwai"],
  calendarDays: 7,
};

const MODE_LABEL = {
  seguro: "Modo Seguro",
  crescimento: "Modo Crescimento",
  monetizacao: "Modo Monetização",
  gerar_midia_ia: "Gerar Mídia IA",
};

function limitNumber(value, fallback, min, max) {
  const parsed = Number(value ?? fallback);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, safe));
}

export function normalizeExecutionInput(input = {}) {
  const mode = ["seguro", "crescimento", "monetizacao", "gerar_midia_ia"].includes(input.mode) ? input.mode : "seguro";
  const raw = { ...DEFAULT_LIMITS, ...(input.limits || {}) };
  const limits = {
    maxIdeas: limitNumber(raw.maxIdeas, DEFAULT_LIMITS.maxIdeas, 1, 10),
    maxVideos: limitNumber(raw.maxVideos, DEFAULT_LIMITS.maxVideos, 1, 5),
    maxShorts: limitNumber(raw.maxShorts, DEFAULT_LIMITS.maxShorts, 0, 50),
    maxScheduledPosts: limitNumber(raw.maxScheduledPosts, DEFAULT_LIMITS.maxScheduledPosts, 0, 60),
    platforms: Array.isArray(raw.platforms) && raw.platforms.length ? raw.platforms : DEFAULT_LIMITS.platforms,
    calendarDays: limitNumber(raw.calendarDays, DEFAULT_LIMITS.calendarDays, 1, 30),
  };
  if (mode === "crescimento") {
    limits.maxIdeas = Math.max(limits.maxIdeas, 5);
    limits.maxVideos = Math.max(limits.maxVideos, 3);
    limits.maxScheduledPosts = Math.max(limits.maxScheduledPosts, 21);
  }
  if (mode === "monetizacao") {
    limits.maxIdeas = Math.min(limits.maxIdeas, 4);
    limits.maxVideos = Math.min(limits.maxVideos, 3);
  }
  if (mode === "gerar_midia_ia") {
    limits.maxIdeas = Math.max(limits.maxIdeas, 2);
    limits.maxVideos = Math.max(limits.maxVideos, 2);
    limits.maxScheduledPosts = 0;
  }
  limits.maxVideos = Math.min(limits.maxVideos, Math.max(1, Math.floor((limits.maxShorts || 5) / 5) || 1));
  return { mode, limits };
}

export function planExecution(input = {}) {
  const { mode, limits } = normalizeExecutionInput(input);
  const channels = getAnalyticsChannels(null, input.workspaceId ?? null);
  const selectedChannel = selectBestChannel(mode, channels);
  const channelId = selectedChannel?.id || 1;
  const focus = getWeeklyFocus(channelId);
  const ideas = selectBestIdeas(channelId, mode, limits);
  return {
    mode,
    modeLabel: MODE_LABEL[mode],
    limits,
    channel: selectedChannel,
    focus,
    ideas,
    rankings: getPriorityRankings(channelId),
    summary: selectedChannel
      ? `Operar ${selectedChannel.name} em ${MODE_LABEL[mode]}, com ${ideas.length} ideia(s) prioritária(s).`
      : "Ainda faltam dados para montar uma operação completa.",
  };
}

export function selectBestChannel(mode = "seguro", channels = getAnalyticsChannels()) {
  if (mode === "monetizacao") {
    return [...channels].sort((a, b) => b.score.monetization - a.score.monetization || b.score.total - a.score.total)[0] || null;
  }
  if (mode === "crescimento") {
    return [...channels].sort((a, b) => b.score.growth + b.score.production - (a.score.growth + a.score.production))[0] || null;
  }
  if (mode === "gerar_midia_ia") {
    return [...channels].sort((a, b) => b.score.originality + b.score.seo - (a.score.originality + a.score.seo))[0] || null;
  }
  return channels[0] || null;
}

export function selectBestIdeas(channelId, mode = "seguro", limits = DEFAULT_LIMITS) {
  const rows = getAnalyticsContent(channelId).filter((i) => !i.videoId);
  const sorted = [...rows].sort((a, b) => {
    if (mode === "monetizacao") return b.score.monetization - a.score.monetization || b.score.total - a.score.total;
    if (mode === "crescimento") return b.score.viral + b.score.retention - (a.score.viral + a.score.retention);
    return b.score.total - a.score.total;
  });
  return sorted
    .filter((i) => i.score.priority !== "Arquivar" && i.score.originality >= 40)
    .slice(0, Math.min(limits.maxIdeas, limits.maxVideos));
}

export function approveSelectedIdeas(runId, ideas) {
  const approved = [];
  for (const item of ideas) {
    const res = setIdeaStatus(item.ideaId, "approved");
    if (res?.error) continue;
    approved.push(item);
  }
  addExecutionStep(runId, "Ideias aprovadas", "completed", { total: approved.length });
  return approved;
}

export function produceSelectedContent(runId, channelId, ideas, limits) {
  const produced = [];
  for (const item of ideas.slice(0, limits.maxVideos)) {
    const idea = getIdeaById(item.ideaId);
    if (!idea) continue;
    const pkg = generatePackage(idea);
    const thumb = generateThumbnail({ ...idea, title: pkg.title });
    const derivatives = generateDerivatives({ ...idea, title: pkg.title });
    const seo = buildSeoPackage(idea, pkg);
    const thumbSet = generateThumbnailSet({ ...idea, title: pkg.title });
    const distItems = generateDistribution({ ...idea, title: pkg.title }, seo);
    const libraryItems = [
      { type: "titulo", title: pkg.title, content: pkg.title },
      { type: "descricao", title: `Descrição — ${idea.topic}`, content: seo.description },
      { type: "hashtags", title: `Hashtags — ${idea.topic}`, content: (seo.hashtags || []).join(" ") },
      { type: "prompt", title: `Prompt thumb — ${idea.topic}`, content: thumbSet.variants[0].prompt },
      { type: "roteiro", title: `Roteiro — ${idea.topic}`, content: pkg.script },
    ];
    const result = produceVideoFromIdea(channelId, idea, pkg, thumb, derivatives, seo, { thumbSet, distItems, libraryItems });
    produced.push({ ...item, videoId: result.videoId, title: pkg.title, shorts: result.shorts, posts: result.posts });
  }
  addExecutionStep(runId, "Conteúdo produzido", "completed", { total: produced.length, shorts: produced.reduce((s, v) => s + v.shorts, 0) });
  return produced;
}

export function generateDistributionPackages(runId, channelId, produced, limits) {
  const packages = [];
  for (const video of produced) {
    const idea = getIdeaById(video.ideaId);
    const seo = getSeoPackage(video.videoId);
    const generated = generateDistribution({ ...(idea || {}), title: video.title }, seo ? { mainTitle: seo.main_title, hashtags: seo.hashtags } : null)
      .filter((item) => limits.platforms.includes(item.platform));
    const saved = saveDistributions(channelId, video.videoId, generated, "rascunho");
    packages.push({ videoId: video.videoId, title: video.title, items: saved });
  }
  addExecutionStep(runId, "Pacotes de distribuição", "completed", { total: packages.reduce((s, p) => s + p.items.length, 0) });
  return packages;
}

export function generateAiMediaPackages(runId, channelId, produced) {
  const packages = [];
  for (const video of produced) {
    const result = generateMediaFactoryForVideo(channelId, video.videoId);
    if (!result?.error) packages.push({ videoId: video.videoId, title: video.title, media: result });
  }
  addExecutionStep(runId, "Mídia IA preparada", "completed", {
    videos: packages.length,
    images: packages.reduce((s, p) => s + (p.media.images?.length || 0), 0),
    thumbnails: packages.reduce((s, p) => s + (p.media.thumbnails?.length || 0), 0),
    shorts: packages.reduce((s, p) => s + (p.media.shorts?.length || 0), 0),
  });
  return packages;
}

export function scheduleContent(runId, channelId, packages, mode, limits) {
  const compliance = getChannelCompliance(channelId);
  const actions = [];
  const blocked = [];
  let scheduledCount = 0;
  let day = 0;

  for (const pack of packages) {
    const risk = compliance.items.find((i) => i.videoId === pack.videoId) || { level: "seguro", issues: [] };
    for (const item of pack.items) {
      if (scheduledCount >= limits.maxScheduledPosts) break;
      if (risk.level === "alto risco") {
        updateDistribution(item.id, { status: "rascunho" });
        enqueue(channelId, "revisao", pack.videoId, "pendente");
        blocked.push({ videoId: pack.videoId, title: pack.title, platform: item.platform, level: risk.level, reason: risk.issues[0]?.msg || "Alto risco de compliance." });
        continue;
      }
      if (risk.level === "revisar") {
        updateDistribution(item.id, { status: "pronto" });
        enqueue(channelId, "revisao", pack.videoId, "pendente");
        blocked.push({ videoId: pack.videoId, title: pack.title, platform: item.platform, level: risk.level, reason: risk.issues[0]?.msg || "Requer revisão humana." });
        continue;
      }
      if (mode === "seguro") {
        updateDistribution(item.id, { status: "pronto" });
        actions.push({ videoId: pack.videoId, title: pack.title, platform: item.platform, status: "pronto", note: "Aguardando revisão humana." });
        continue;
      }
      const scheduled_at = nextDate(day, limits.calendarDays);
      updateDistribution(item.id, { status: "agendado", scheduled_at });
      actions.push({ videoId: pack.videoId, title: pack.title, platform: item.platform, status: "agendado", scheduled_at });
      scheduledCount++;
      day++;
    }
  }
  addExecutionStep(runId, "Calendário preparado", "completed", { scheduled: scheduledCount, blocked: blocked.length });
  return { actions, blocked, compliance };
}

export function generateExecutionReport({ run, plan, approved, produced, scheduled, media = [], errors = [] }) {
  const shorts = produced.reduce((s, v) => s + (v.shorts || 0), 0);
  const mediaImages = media.reduce((s, p) => s + (p.media.images?.length || 0), 0);
  const mediaShorts = media.reduce((s, p) => s + (p.media.shorts?.length || 0), 0);
  const summary = plan.mode === "gerar_midia_ia"
    ? `${plan.channel?.name || "Canal"} operado em ${plan.modeLabel}: ${produced.length} vídeo(s), ${mediaImages} prompt(s) de imagem, ${mediaShorts} pacote(s) curto(s) e storyboard preparados.`
    : `${plan.channel?.name || "Canal"} operado em ${plan.modeLabel}: ${approved.length} ideia(s), ${produced.length} vídeo(s), ${shorts} short(s), ${scheduled.actions.length} item(ns) preparado(s).`;
  return {
    summary,
    channel: plan.channel,
    mode: plan.mode,
    modeLabel: plan.modeLabel,
    reason: plan.focus?.reason,
    approvedIdeas: approved.map((i) => ({ ideaId: i.ideaId, title: i.title, score: i.score.total })),
    producedVideos: produced.map((v) => ({ videoId: v.videoId, title: v.title, shorts: v.shorts })),
    mediaFactory: {
      videos: media.length,
      images: mediaImages,
      thumbnails: media.reduce((s, p) => s + (p.media.thumbnails?.length || 0), 0),
      scenes: media.reduce((s, p) => s + (p.media.scenes?.length || 0), 0),
      shorts: mediaShorts,
      waitingRender: media.reduce((s, p) => s + (p.media.videos?.length || 0) + (p.media.shorts?.length || 0), 0),
    },
    distributionPackages: scheduled.actions,
    scheduledPosts: scheduled.actions.filter((a) => a.status === "agendado"),
    reviewItems: scheduled.blocked.filter((b) => b.level === "revisar"),
    blockedItems: scheduled.blocked.filter((b) => b.level === "alto risco"),
    risks: scheduled.compliance.items.slice(0, 5),
    nextActions: [
      ...(plan.mode === "gerar_midia_ia" ? ["Revisar prompts e storyboards antes de renderizar em Veo, Kling, Runway ou Pika."] : []),
      "Revisar conteúdos marcados como pronto antes de publicar.",
      "Conferir calendário dos próximos dias.",
      "Registrar métricas reais após publicação para alimentar o aprendizado.",
    ],
    errors,
    runId: run.id,
  };
}

export async function runExecution(input = {}) {
  const plan = planExecution(input);
  if (!plan.channel) throw new Error("Nenhum canal disponível para execução.");
  const run = createExecutionRun({ channelId: plan.channel.id, mode: plan.mode, limits: plan.limits, selected: { channel: plan.channel, ideas: plan.ideas } });
  const errors = [];
  try {
    addExecutionStep(run.id, "Plano definido", "completed", { channel: plan.channel.name, mode: plan.mode });
    const approved = approveSelectedIdeas(run.id, plan.ideas);
    const produced = produceSelectedContent(run.id, plan.channel.id, approved, plan.limits);
    const media = plan.mode === "gerar_midia_ia" ? generateAiMediaPackages(run.id, plan.channel.id, produced) : [];
    const packages = generateDistributionPackages(run.id, plan.channel.id, produced, plan.limits);
    const scheduled = scheduleContent(run.id, plan.channel.id, packages, plan.mode, plan.limits);
    const report = generateExecutionReport({ run, plan, approved, produced, scheduled, media, errors });
    const saved = finishExecutionRun(run.id, { status: "completed", actions: scheduled.actions, blocked: scheduled.blocked, errors, report });
    return saved;
  } catch (error) {
    errors.push({ message: error.message });
    addExecutionStep(run.id, "Erro na execução", "failed", { message: error.message });
    const report = generateExecutionReport({ run, plan, approved: [], produced: [], scheduled: { actions: [], blocked: [], compliance: { items: [] } }, errors });
    return finishExecutionRun(run.id, { status: "failed", actions: [], blocked: [], errors, report });
  }
}

function nextDate(offset, period) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + (offset % Math.max(1, period)));
  return d.toISOString().slice(0, 10);
}
