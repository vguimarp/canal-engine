// ============================================================
// Camada de acesso a dados — consultas reutilizadas pelas rotas de API.
// ============================================================

import { getDb, syncDb } from "./db.js";
import { channelMonetizationPotential, videoRevenue, nicheRpm, priorityLabel } from "./skills/monetization.js";
import { checkContent } from "./skills/compliance.js";
import { channelScore, nicheScore, contentScore, opportunityType } from "./skills/analytics.js";
import { generateMediaFactoryPackage } from "./skills/mediaFactory.js";
import { writeLocalThumbnailFiles } from "./mediaExport.js";

const j = (s) => { try { return JSON.parse(s); } catch { return s; } };
const num = (n) => Number(n || 0);

export function getChannels() {
  return getDb().prepare("SELECT * FROM channels ORDER BY id").all();
}

export function getChannelById(id) {
  return getDb().prepare("SELECT * FROM channels WHERE id=?").get(id);
}

const CHANNEL_FIELDS = ["name", "niche", "description", "target_audience", "language", "strategy", "posting_frequency", "main_goal", "active"];

export function createChannel(data = {}, ctx = {}) {
  const db = getDb();
  if (!data.name || !data.niche) return { error: "Nome e nicho são obrigatórios" };
  const r = db.prepare(`INSERT INTO channels
    (name, niche, description, target_audience, language, strategy, posting_frequency, main_goal, active, workspace_id, owner_user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    data.name, data.niche, data.description || null, data.target_audience || null,
    data.language || "pt-BR", data.strategy || null, data.posting_frequency || null,
    data.main_goal || null, data.active === 0 ? 0 : 1,
    ctx.workspaceId ?? null, ctx.ownerUserId ?? null
  );
  syncDb();
  return getChannelById(r.lastInsertRowid);
}

export function updateChannel(id, data = {}) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM channels WHERE id=?").get(id);
  if (!existing) return null;
  const fields = CHANNEL_FIELDS.filter((f) => f in data);
  if (!fields.length) return existing;
  const sets = fields.map((f) => `${f}=?`).join(", ");
  const vals = fields.map((f) => data[f]);
  db.prepare(`UPDATE channels SET ${sets} WHERE id=?`).run(...vals, id);
  syncDb();
  return getChannelById(id);
}

// Canais com estatísticas agregadas — alimenta cards, ranking e comparação.
// workspaceId opcional: filtra por workspace (FASE 3). undefined = todos (compat).
export function getChannelsWithStats(workspaceId) {
  const db = getDb();
  const channels = workspaceId != null
    ? db.prepare("SELECT * FROM channels WHERE workspace_id=? ORDER BY id").all(workspaceId)
    : db.prepare("SELECT * FROM channels ORDER BY id").all();
  return channels.map((c) => {
    const one = (sql) => db.prepare(sql).get(c.id);
    const ideas = one("SELECT COUNT(*) n, ROUND(AVG(score),1) avgScore, ROUND(AVG(originality),1) avgOrig FROM ideas WHERE channel_id=?");
    const longVideos = one("SELECT COUNT(*) n FROM videos WHERE channel_id=? AND format='long'").n;
    const shorts = one("SELECT COUNT(*) n FROM videos WHERE channel_id=? AND format='short'").n;
    const posts = one("SELECT COUNT(*) n FROM social_posts sp JOIN videos v ON v.id=sp.video_id WHERE v.channel_id=?").n;
    const keywords = one("SELECT COUNT(*) n FROM keywords WHERE channel_id=?").n;
    const produced = one("SELECT COUNT(*) n FROM ideas WHERE channel_id=? AND status='produced'").n;
    const avgScore = ideas.avgScore || 0;
    const avgOrig = ideas.avgOrig || 0;
    // Índice de potencial (0-100): qualidade das ideias + execução (vídeos) + originalidade.
    const potential = Number(Math.min(100,
      avgScore * 0.5 + avgOrig * 0.3 + Math.min(20, longVideos * 2.5)
    ).toFixed(1));
    // Monetização: receita estimada acumulada + potencial do nicho.
    const views = one("SELECT COALESCE(SUM(m.views),0) v FROM metrics m JOIN videos vi ON vi.id=m.video_id WHERE vi.channel_id=?").v;
    const estRevenue = videoRevenue(views, c.niche);
    const monetizationPotential = channelMonetizationPotential({ longVideos, avgScore }, c.niche);
    return {
      ...c,
      stats: {
        ideas: ideas.n || 0, longVideos, shorts, posts, keywords, produced, avgScore, avgOriginality: avgOrig, potential,
        rpm: nicheRpm(c.niche), views, estRevenue, monetizationPotential, priority: priorityLabel(monetizationPotential),
      },
    };
  }).sort((a, b) => b.stats.monetizationPotential - a.stats.monetizationPotential);
}

// Compliance por canal: roda a checagem em cada vídeo longo e resume os riscos.
export function getChannelCompliance(channelId = 1) {
  const db = getDb();
  const videos = db.prepare(`
    SELECT v.id, v.title, v.description, v.hashtags, v.tags, v.idea_id,
      (SELECT overlay_text FROM thumbnails WHERE video_id=v.id ORDER BY id DESC LIMIT 1) overlay_text,
      (SELECT originality FROM ideas WHERE id=v.idea_id) originality
    FROM videos v WHERE v.channel_id=? AND v.format='long'`).all(channelId);
  const items = videos.map((v) => {
    const res = checkContent({
      title: v.title, description: v.description,
      hashtags: j(v.hashtags) || [], tags: j(v.tags) || [],
      originality: v.originality ?? 100, overlay_text: v.overlay_text || "",
    });
    return { videoId: v.id, title: v.title, level: res.level, score: res.score, issues: res.issues };
  });
  const summary = {
    seguro: items.filter((i) => i.level === "seguro").length,
    revisar: items.filter((i) => i.level === "revisar").length,
    altoRisco: items.filter((i) => i.level === "alto risco").length,
  };
  return { summary, items: items.sort((a, b) => a.score - b.score) };
}

// Análise de monetização consolidada do canal (por vídeo, formato e prioridades).
export function getMonetization(channelId = 1) {
  const db = getDb();
  const ch = db.prepare("SELECT niche FROM channels WHERE id=?").get(channelId);
  const niche = ch?.niche;
  const videos = db.prepare(`
    SELECT v.id, v.title, v.format,
      (SELECT COALESCE(SUM(views),0) FROM metrics WHERE video_id=v.id) views
    FROM videos v WHERE v.channel_id=? AND v.format='long'`).all(channelId);
  const perVideo = videos.map((v) => ({
    videoId: v.id, title: v.title, views: v.views, revenue: videoRevenue(v.views, niche),
  })).sort((a, b) => b.revenue - a.revenue);
  const total = Number(perVideo.reduce((s, v) => s + v.revenue, 0).toFixed(2));
  return {
    niche, rpm: nicheRpm(niche), totalEstimated: total,
    topVideos: perVideo.slice(0, 5),
    priorityVideos: perVideo.slice(0, 3),
  };
}

export function getDashboard(channelId = 1, workspaceId = null) {
  const db = getDb();
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);

  // --- Métricas de ideias (Fase 5) ---
  const ideaStats = one(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) rejected,
      SUM(CASE WHEN status='produced' THEN 1 ELSE 0 END) produced,
      ROUND(AVG(score),1)       avgScore,
      ROUND(AVG(originality),1) avgOriginality
    FROM ideas WHERE channel_id=?`, channelId);

  // --- Contagens de conteúdo ---
  const longCount = one("SELECT COUNT(*) c FROM videos WHERE channel_id=? AND format='long'", channelId).c;
  const shortCount = one("SELECT COUNT(*) c FROM videos WHERE channel_id=? AND format='short'", channelId).c;
  const postCount = one(`SELECT COUNT(*) c FROM social_posts sp
    JOIN videos v ON v.id=sp.video_id WHERE v.channel_id=?`, channelId).c;
  const mediaFactory = getMediaFactorySummary(channelId);

  // Taxa de conversão: ideias longas que viraram vídeo longo.
  const longIdeas = one("SELECT COUNT(*) c FROM ideas WHERE channel_id=? AND format='long'", channelId).c;
  const conversionRate = longIdeas > 0 ? Number(((longCount / longIdeas) * 100).toFixed(1)) : 0;

  return {
    // Mantém o formato antigo usado pelo painel atual (compatibilidade).
    counts: {
      videosPublished: one("SELECT COUNT(*) c FROM videos WHERE channel_id=? AND status='published'", channelId).c,
      videosPending: one("SELECT COUNT(*) c FROM videos WHERE channel_id=? AND format='long' AND status='pending'", channelId).c,
      shortsPending: one("SELECT COUNT(*) c FROM videos WHERE channel_id=? AND format='short' AND status='pending'", channelId).c,
      ideas: ideaStats.total || 0,
      keywords: one("SELECT COUNT(*) c FROM keywords WHERE channel_id=?", channelId).c,
    },
    // Bloco executivo (Fase 5)
    ideas: {
      total: ideaStats.total || 0,
      approved: ideaStats.approved || 0,
      rejected: ideaStats.rejected || 0,
      produced: ideaStats.produced || 0,
      avgScore: ideaStats.avgScore || 0,
      avgOriginality: ideaStats.avgOriginality || 0,
    },
    content: { longVideos: longCount, shorts: shortCount, posts: postCount },
    mediaFactory,
    funnel: {
      ideas: ideaStats.total || 0,
      approved: (ideaStats.approved || 0) + (ideaStats.produced || 0), // aprovadas inclui as já produzidas
      produced: ideaStats.produced || 0,
    },
    conversionRate, // % de ideias longas que viraram vídeo
    totals: one(`SELECT
        COALESCE(SUM(m.views),0) views,
        COALESCE(SUM(m.subs_gained),0) subs,
        ROUND(AVG(m.ctr),1) avgCtr,
        ROUND(AVG(m.retention),1) avgRetention
      FROM metrics m JOIN videos v ON v.id=m.video_id WHERE v.channel_id=?`, channelId),
    topIdeas: all(`SELECT id, format, topic, angle, score, originality, status
      FROM ideas WHERE channel_id=? ORDER BY score DESC LIMIT 5`, channelId),
    // Vídeos com métricas agregadas via subquery — evita duplicação (bug B1).
    topVideos: all(`SELECT v.id, v.title,
        (SELECT COALESCE(SUM(views),0) FROM metrics WHERE video_id=v.id) views,
        (SELECT ROUND(AVG(ctr),1)      FROM metrics WHERE video_id=v.id) ctr,
        (SELECT ROUND(AVG(retention),1) FROM metrics WHERE video_id=v.id) retention,
        (SELECT COALESCE(SUM(subs_gained),0) FROM metrics WHERE video_id=v.id) subs_gained
      FROM videos v
      WHERE v.channel_id=? AND v.format='long'
      ORDER BY views DESC LIMIT 5`, channelId),
    // Últimos vídeos longos produzidos (ordem de criação).
    recentVideos: all(`SELECT id, title, status, created_at
      FROM videos WHERE channel_id=? AND format='long'
      ORDER BY id DESC LIMIT 5`, channelId),
    topTopics: all(`SELECT topic, ROUND(AVG(score),1) avgScore, COUNT(*) n
      FROM ideas WHERE channel_id=? GROUP BY topic ORDER BY avgScore DESC LIMIT 5`, channelId),

    // --- Distribuição / Calendário (Central Multiplataforma) ---
    distribution: one(`SELECT
        COUNT(*) total,
        SUM(CASE WHEN status='agendado'  THEN 1 ELSE 0 END) scheduled,
        SUM(CASE WHEN status='publicado' THEN 1 ELSE 0 END) published,
        SUM(CASE WHEN status='rascunho'  THEN 1 ELSE 0 END) draft
      FROM distributions WHERE channel_id=?`, channelId),

    // --- Melhor formato (por retenção média) ---
    bestFormat: one(`SELECT v.format,
        ROUND(AVG(m.retention),1) retention, COUNT(*) n
      FROM videos v JOIN metrics m ON m.video_id=v.id
      WHERE v.channel_id=? GROUP BY v.format ORDER BY retention DESC LIMIT 1`, channelId),

    // --- Monetização do canal ativo ---
    monetization: (() => {
      const ch = one("SELECT niche FROM channels WHERE id=?", channelId);
      const mon = getMonetization(channelId);
      return { niche: ch?.niche, rpm: mon.rpm, totalEstimated: mon.totalEstimated, priorityVideos: mon.priorityVideos };
    })(),

    // --- Analytics & Monetization Engine ---
    analytics: getAnalyticsExecutive(channelId, workspaceId),

    // --- Compliance: contagem de risco ---
    compliance: getChannelCompliance(channelId).summary,

    // --- Filas ---
    queues: getQueueSummary(channelId),
  };
}

// Visão executiva multi-canal: rankings de canais e de nichos, melhor canal/vídeo.
export function getExecutiveOverview(workspaceId = null) {
  const channels = getChannelsWithStats(workspaceId); // já ordenado por monetizationPotential desc
  const byNiche = {};
  for (const c of channels) {
    const k = c.niche;
    byNiche[k] = byNiche[k] || { niche: k, channels: 0, videos: 0, estRevenue: 0, monetizationPotential: 0 };
    byNiche[k].channels++;
    byNiche[k].videos += c.stats.longVideos;
    byNiche[k].estRevenue += c.stats.estRevenue;
    byNiche[k].monetizationPotential = Math.max(byNiche[k].monetizationPotential, c.stats.monetizationPotential);
  }
  const nicheRanking = Object.values(byNiche)
    .map((n) => ({ ...n, estRevenue: Number(n.estRevenue.toFixed(2)) }))
    .sort((a, b) => b.monetizationPotential - a.monetizationPotential);

  const totals = channels.reduce((a, c) => ({
    channels: a.channels + 1,
    videos: a.videos + c.stats.longVideos,
    shorts: a.shorts + c.stats.shorts,
    ideas: a.ideas + c.stats.ideas,
    estRevenue: a.estRevenue + c.stats.estRevenue,
  }), { channels: 0, videos: 0, shorts: 0, ideas: 0, estRevenue: 0 });
  totals.estRevenue = Number(totals.estRevenue.toFixed(2));

  // Melhor vídeo global (por receita estimada).
  const db = getDb();
  const bestVideoSql = `SELECT v.id, v.title, v.channel_id, ch.niche,
      (SELECT COALESCE(SUM(views),0) FROM metrics WHERE video_id=v.id) views
    FROM videos v JOIN channels ch ON ch.id=v.channel_id
    WHERE v.format='long' ${workspaceId != null ? "AND ch.workspace_id=?" : ""}
    ORDER BY views DESC LIMIT 1`;
  const bestVideo = workspaceId != null
    ? db.prepare(bestVideoSql).get(workspaceId)
    : db.prepare(bestVideoSql).get();
  const bestVideoRevenue = bestVideo ? videoRevenue(bestVideo.views, bestVideo.niche) : 0;

  return {
    totals,
    channelRanking: channels.map((c) => ({
      id: c.id, name: c.name, niche: c.niche,
      monetizationPotential: c.stats.monetizationPotential, potential: c.stats.potential,
      estRevenue: c.stats.estRevenue, priority: c.stats.priority,
      videos: c.stats.longVideos, ideas: c.stats.ideas,
    })),
    nicheRanking,
    bestChannel: channels[0] ? { name: channels[0].name, niche: channels[0].niche, monetizationPotential: channels[0].stats.monetizationPotential } : null,
    bestNiche: nicheRanking[0] || null,
    bestVideo: bestVideo ? { ...bestVideo, revenue: bestVideoRevenue } : null,
  };
}

function getChannelAnalyticsInput(channelId) {
  const db = getDb();
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const channel = one("SELECT * FROM channels WHERE id=?", channelId);
  if (!channel) return null;
  const ideas = one(`SELECT COUNT(*) ideas,
      SUM(CASE WHEN status='produced' THEN 1 ELSE 0 END) produced,
      ROUND(AVG(score),1) avgIdeaScore,
      ROUND(AVG(originality),1) avgOriginality
    FROM ideas WHERE channel_id=?`, channelId);
  const videos = one(`SELECT
      SUM(CASE WHEN format='long' THEN 1 ELSE 0 END) longVideos,
      SUM(CASE WHEN format='short' THEN 1 ELSE 0 END) shorts,
      SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) publishedVideos
    FROM videos WHERE channel_id=?`, channelId);
  const posts = one(`SELECT COUNT(*) posts FROM social_posts sp
    JOIN videos v ON v.id=sp.video_id WHERE v.channel_id=?`, channelId);
  const metrics = one(`SELECT
      COALESCE(SUM(m.views),0) views,
      COALESCE(SUM(m.subs_gained),0) subs,
      ROUND(AVG(m.ctr),1) avgCtr,
      ROUND(AVG(m.retention),1) avgRetention
    FROM metrics m JOIN videos v ON v.id=m.video_id WHERE v.channel_id=?`, channelId);
  const seo = {
    ...one(`SELECT ROUND(AVG(sp.seo_score),1) avgSeoScore
      FROM seo_packages sp JOIN videos v ON v.id=sp.video_id WHERE v.channel_id=?`, channelId),
    ...one(`SELECT
        ROUND(AVG(opportunity),1) avgKeywordOpportunity,
        ROUND(AVG(potential),1) avgSeoPotential,
        ROUND(AVG(competition),1) avgCompetition,
        ROUND(AVG(difficulty),1) avgDifficulty
      FROM keywords WHERE channel_id=?`, channelId),
  };
  const trends = one(`SELECT
      ROUND(AVG(score),1) avgTrendScore,
      ROUND(AVG(production_ease),1) avgProductionEase,
      ROUND(AVG(monetization),1) avgTrendMonetization
    FROM trends WHERE channel_id=?`, channelId);
  return {
    ...channel,
    ...ideas,
    ...videos,
    ...posts,
    ...metrics,
    ...seo,
    ...trends,
    longVideos: num(videos.longVideos),
    shorts: num(videos.shorts),
    publishedVideos: num(videos.publishedVideos),
    posts: num(posts.posts),
    ideas: num(ideas.ideas),
    produced: num(ideas.produced),
  };
}

export function getAnalyticsChannels(channelId = null, workspaceId = null) {
  const ids = channelId ? [Number(channelId)]
    : workspaceId != null
      ? getDb().prepare("SELECT id FROM channels WHERE workspace_id=? ORDER BY id").all(workspaceId).map((c) => c.id)
      : getDb().prepare("SELECT id FROM channels ORDER BY id").all().map((c) => c.id);
  return ids.map((id) => {
    const input = getChannelAnalyticsInput(id);
    if (!input) return null;
    const score = channelScore(input);
    return {
      id: input.id,
      name: input.name,
      niche: input.niche,
      active: input.active,
      score,
      metrics: {
        ideas: input.ideas,
        produced: input.produced,
        longVideos: input.longVideos,
        shorts: input.shorts,
        posts: input.posts,
        views: num(input.views),
        subs: num(input.subs),
        avgCtr: num(input.avgCtr),
        avgRetention: num(input.avgRetention),
        avgSeoScore: num(input.avgSeoScore),
        avgOriginality: num(input.avgOriginality),
      },
      recommendations: buildChannelRecommendations(input, score),
    };
  }).filter(Boolean).sort((a, b) => b.score.total - a.score.total);
}

export function getAnalyticsNiches(channelId = null, workspaceId = null) {
  const db = getDb();
  const rows = db.prepare(`WITH
      ia AS (SELECT channel_id, AVG(score) avgIdeaScore FROM ideas GROUP BY channel_id),
      ta AS (SELECT channel_id, AVG(score) avgTrendScore, AVG(production_ease) avgProductionEase FROM trends GROUP BY channel_id),
      ka AS (SELECT channel_id, AVG(potential) avgSeoPotential, AVG(competition) avgCompetition, AVG(difficulty) avgDifficulty FROM keywords GROUP BY channel_id),
      va AS (SELECT channel_id, COUNT(*) videos FROM videos WHERE format='long' GROUP BY channel_id)
    SELECT c.niche,
      COUNT(c.id) channels,
      ROUND(AVG(ia.avgIdeaScore),1) avgIdeaScore,
      ROUND(AVG(ta.avgTrendScore),1) avgTrendScore,
      ROUND(AVG(ta.avgProductionEase),1) avgProductionEase,
      ROUND(AVG(ka.avgSeoPotential),1) avgSeoPotential,
      ROUND(AVG(ka.avgCompetition),1) avgCompetition,
      ROUND(AVG(ka.avgDifficulty),1) avgDifficulty,
      COALESCE(SUM(va.videos),0) videos
    FROM channels c
    LEFT JOIN ia ON ia.channel_id=c.id
    LEFT JOIN ta ON ta.channel_id=c.id
    LEFT JOIN ka ON ka.channel_id=c.id
    LEFT JOIN va ON va.channel_id=c.id
    WHERE (? IS NULL OR c.id=?) AND (? IS NULL OR c.workspace_id=?)
    GROUP BY c.niche`).all(channelId, channelId, workspaceId, workspaceId);
  return rows.map((r) => {
    const score = nicheScore(r);
    return {
      niche: r.niche,
      channels: num(r.channels),
      videos: num(r.videos),
      score,
      recommendations: buildNicheRecommendations(r, score),
    };
  }).sort((a, b) => b.score.total - a.score.total);
}

export function getAnalyticsContent(channelId = 1) {
  const db = getDb();
  const rows = db.prepare(`SELECT i.id ideaId, i.topic, i.angle, i.format, i.originality,
      i.views_potential viewsPotential, i.score ideaScore, i.status,
      v.id videoId, v.title, v.status videoStatus,
      COALESCE((SELECT SUM(views) FROM metrics WHERE video_id=v.id),0) views,
      (SELECT ROUND(AVG(ctr),1) FROM metrics WHERE video_id=v.id) ctr,
      (SELECT ROUND(AVG(retention),1) FROM metrics WHERE video_id=v.id) retention,
      (SELECT seo_score FROM seo_packages WHERE video_id=v.id ORDER BY id DESC LIMIT 1) seoScore,
      (SELECT ROUND(AVG(potential),1) FROM keywords WHERE video_id=v.id) keywordPotential,
      (SELECT ROUND(AVG(monetization),1) FROM trends WHERE channel_id=i.channel_id AND topic=i.topic) trendMonetization,
      (SELECT ROUND(AVG(retention_pot),1) FROM trends WHERE channel_id=i.channel_id AND topic=i.topic) retentionPotential
    FROM ideas i
    LEFT JOIN videos v ON v.idea_id=i.id AND v.format='long'
    WHERE i.channel_id=? AND i.format='long'
    ORDER BY i.score DESC`).all(channelId);
  return rows.map((r) => {
    const viewsScore = Math.min(100, Math.log10(Math.max(1, num(r.views))) * 20);
    const score = contentScore({
      seoScore: r.seoScore,
      keywordPotential: r.keywordPotential,
      viewsPotential: r.viewsPotential || r.ideaScore,
      viewsScore,
      ctrScore: num(r.ctr) * 10,
      retention: r.retention,
      retentionPotential: r.retentionPotential,
      monetization: r.trendMonetization,
      originality: r.originality,
    });
    return {
      ideaId: r.ideaId,
      videoId: r.videoId,
      title: r.title || r.angle,
      topic: r.topic,
      format: r.format,
      status: r.videoStatus || r.status,
      score,
      metrics: { views: num(r.views), ctr: num(r.ctr), retention: num(r.retention), originality: num(r.originality) },
    };
  }).sort((a, b) => b.score.total - a.score.total);
}

export function getAnalyticsOpportunities(channelId = 1, workspaceId = null) {
  const channels = getAnalyticsChannels(null, workspaceId);
  const niches = getAnalyticsNiches(null, workspaceId);
  const content = getAnalyticsContent(channelId);
  const activeChannel = channels.find((c) => c.id === Number(channelId));
  const opportunities = [];

  for (const n of niches.slice(0, 5)) {
    opportunities.push({
      type: "nicho",
      title: n.niche,
      score: n.score.total,
      level: opportunityType(n.score.total),
      recommendation: n.recommendations[0] || "Manter acompanhamento do nicho.",
    });
  }
  for (const c of content.filter((i) => i.score.priority === "Produzir agora").slice(0, 5)) {
    opportunities.push({
      type: "conteudo",
      title: c.title,
      score: c.score.total,
      level: opportunityType(c.score.total),
      recommendation: "Produzir agora com revisao humana, fontes claras e pacote de SEO aplicado.",
    });
  }
  if (activeChannel?.score.production < 55) {
    opportunities.push({
      type: "producao",
      title: "Aumentar cadencia do canal ativo",
      score: activeChannel.score.production,
      level: "media",
      recommendation: "Aprovar ideias fortes e transformar em videos antes de gerar novas listas extensas.",
    });
  }
  if (activeChannel?.score.seo < 55) {
    opportunities.push({
      type: "seo",
      title: "Reforcar SEO dos videos existentes",
      score: activeChannel.score.seo,
      level: "media",
      recommendation: "Gerar ou revisar pacotes de SEO dos videos com maior potencial de retencao.",
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

export function getAnalyticsRecommendations(channelId = 1, workspaceId = null) {
  const channel = getAnalyticsChannels(channelId, workspaceId)[0];
  const content = getAnalyticsContent(channelId);
  const now = content.filter((i) => i.score.priority === "Produzir agora").slice(0, 5);
  const later = content.filter((i) => i.score.priority === "Produzir depois").slice(0, 5);
  const archive = content.filter((i) => i.score.priority === "Arquivar").slice(0, 5);
  return {
    focus: getWeeklyFocus(channelId, workspaceId),
    rankings: getPriorityRankings(channelId, workspaceId),
    channel,
    produceNow: now,
    produceLater: later,
    archive,
    actions: [
      ...(channel?.recommendations || []),
      now.length ? `Produzir primeiro: ${now[0].title}` : "Gerar ou aprovar novas ideias antes de produzir.",
      "Manter revisao humana e fontes para evitar conteudo repetitivo ou enganoso.",
    ],
  };
}

export function getAnalyticsMonetization(channelId = null, workspaceId = null) {
  const channels = getAnalyticsChannels(channelId, workspaceId);
  const niches = getAnalyticsNiches(channelId, workspaceId);
  const content = channelId ? getAnalyticsContent(channelId) : [];
  return {
    disclaimer: "Potencial relativo. Nao e previsao de faturamento, promessa de lucro ou garantia de monetizacao.",
    channels: channels.map((c, i) => ({
      rank: i + 1,
      id: c.id,
      name: c.name,
      niche: c.niche,
      potential: c.score.monetization,
      priority: c.score.priority,
    })),
    niches: niches.map((n, i) => ({
      rank: i + 1,
      niche: n.niche,
      potential: n.score.monetization,
      priority: n.score.priority,
    })),
    content: content.slice(0, 10).map((c, i) => ({
      rank: i + 1,
      ideaId: c.ideaId,
      videoId: c.videoId,
      title: c.title,
      potential: c.score.monetization,
      priority: c.score.priority,
    })),
  };
}

export function getAnalyticsFormats(channelId = 1) {
  const db = getDb();
  const rows = db.prepare(`SELECT v.format,
      COUNT(*) total,
      COALESCE(SUM(m.views),0) views,
      COALESCE(SUM(m.subs_gained),0) subs,
      ROUND(AVG(m.ctr),1) ctr,
      ROUND(AVG(m.retention),1) retention,
      ROUND(AVG(i.originality),1) originality,
      ROUND(AVG(i.score),1) ideaScore
    FROM videos v
    LEFT JOIN metrics m ON m.video_id=v.id
    LEFT JOIN ideas i ON i.id=v.idea_id
    WHERE v.channel_id=?
    GROUP BY v.format`).all(channelId);
  return rows.map((r) => {
    const viewsScore = Math.min(100, Math.log10(Math.max(1, num(r.views))) * 20);
    const score = contentScore({
      seoScore: r.ideaScore,
      viewsPotential: r.ideaScore,
      viewsScore,
      ctrScore: num(r.ctr) * 10,
      retention: r.retention,
      monetization: r.ideaScore,
      originality: r.originality,
    });
    return {
      format: r.format,
      total: num(r.total),
      score: score.total,
      reason: `${num(r.total)} peça(s), retenção ${num(r.retention)}%, originalidade ${num(r.originality)}`,
      action: r.format === "short" ? "testar com short" : "transformar em vídeo longo",
    };
  }).sort((a, b) => b.score - a.score);
}

export function getWeeklyFocus(channelId = 1, workspaceId = null) {
  const channels = getAnalyticsChannels(null, workspaceId);
  const active = channels.find((c) => c.id === Number(channelId)) || channels[0] || null;
  const targetChannel = channels[0] || active;
  const targetChannelId = targetChannel?.id || Number(channelId);
  const niches = getAnalyticsNiches(null, workspaceId);
  const content = getAnalyticsContent(targetChannelId);
  const formats = getAnalyticsFormats(targetChannelId);
  const compliance = getChannelCompliance(targetChannelId);
  const distributions = getDistributions(targetChannelId);
  const reusable = distributions
    .filter((d) => ["rascunho", "pronto", "agendado"].includes(d.status))
    .slice(0, 5)
    .map((d) => ({ id: d.id, title: d.video_title || d.title, platform: d.platform, status: d.status, action: "reaproveitar" }));
  const produceNow = content.filter((c) => c.score.priority === "Produzir agora").slice(0, 3);
  const archive = content.filter((c) => c.score.priority === "Arquivar").slice(0, 5);
  const bestFormat = formats[0] || { format: "long", score: 0, reason: "Sem métricas suficientes", action: "transformar em vídeo longo" };
  const riskCount = compliance.summary.revisar + compliance.summary.altoRisco;
  const longGoal = Math.min(3, Math.max(1, produceNow.length || 1));
  const shortGoal = longGoal * 5;

  return {
    channel: targetChannel,
    niche: niches[0] || null,
    format: bestFormat,
    reason: targetChannel
      ? `Maior combinação de score (${targetChannel.score.total}), monetização relativa (${targetChannel.score.monetization}) e produção (${targetChannel.score.production}).`
      : "Ainda faltam dados para eleger um canal com segurança.",
    plan: [
      `Produzir ${longGoal} vídeo(s) longo(s) com revisão humana.`,
      `Gerar ${shortGoal} short(s) a partir dos melhores vídeos.`,
      "Distribuir em YouTube Shorts, TikTok, Instagram Reels, Facebook e Kwai quando fizer sentido.",
      "Agendar 1 publicação por dia e marcar como publicado após sair.",
      riskCount ? "Revisar riscos de compliance antes de publicar." : "Manter padrão seguro de títulos, hashtags e fontes.",
    ],
    produceFirst: produceNow,
    reuse: reusable,
    archive,
    risks: compliance.items.slice(0, 5).map((i) => ({
      videoId: i.videoId,
      title: i.title,
      level: i.level,
      reason: i.issues[0]?.msg || "Seguro: sem sinais críticos.",
    })),
  };
}

export function getPriorityRankings(channelId = 1, workspaceId = null) {
  const channelRows = getAnalyticsChannels(null, workspaceId);
  const channels = channelRows.map((c) => ({
    type: "canal",
    id: c.id,
    title: c.name,
    score: c.score.total,
    reason: c.recommendations[0],
    action: c.id === channelRows[0]?.id ? "produzir agora" : "observar",
  }));
  const niches = getAnalyticsNiches(null, workspaceId).map((n) => ({
    type: "nicho",
    title: n.niche,
    score: n.score.total,
    reason: n.recommendations[0],
    action: n.score.difficulty > 70 ? "testar com short" : "produzir agora",
  }));
  const ideas = getAnalyticsContent(channelId).map((c) => ({
    type: "ideia",
    id: c.ideaId,
    title: c.title,
    score: c.score.total,
    reason: `SEO ${c.score.seo}, viral ${c.score.viral}, retenção ${c.score.retention}, monetização relativa ${c.score.monetization}.`,
    action: actionFromPriority(c.score.priority, c.videoId),
  }));
  const videos = getAnalyticsContent(channelId).filter((c) => c.videoId).map((c) => ({
    type: "video",
    id: c.videoId,
    title: c.title,
    score: c.score.total,
    reason: `${num(c.metrics.views).toLocaleString("pt-BR")} views, CTR ${c.metrics.ctr}%, retenção ${c.metrics.retention}%.`,
    action: "reaproveitar",
  }));
  const formats = getAnalyticsFormats(channelId).map((f) => ({ type: "formato", title: f.format, score: f.score, reason: f.reason, action: f.action }));
  const opportunities = getAnalyticsOpportunities(channelId, workspaceId).map((o) => ({
    type: "oportunidade",
    title: o.title,
    score: o.score,
    reason: o.recommendation,
    action: o.type === "conteudo" ? "produzir agora" : "testar com short",
  }));
  return {
    channels: channels.slice(0, 5),
    niches: niches.slice(0, 5),
    ideas: ideas.slice(0, 8),
    videos: videos.slice(0, 8),
    formats: formats.slice(0, 5),
    opportunities: opportunities.slice(0, 8),
  };
}

export function getAnalyticsExecutive(channelId = 1, workspaceId = null) {
  const channels = getAnalyticsChannels(null, workspaceId);
  const niches = getAnalyticsNiches(null, workspaceId);
  const content = getAnalyticsContent(channelId);
  const opportunities = getAnalyticsOpportunities(channelId, workspaceId);
  const formats = getAnalyticsFormats(channelId);
  const focus = getWeeklyFocus(channelId, workspaceId);
  const rankings = getPriorityRankings(channelId, workspaceId);
  return {
    focus,
    bestChannel: channels[0] || null,
    bestNiche: niches[0] || null,
    bestFormat: formats[0] || null,
    bestContent: content[0] || null,
    channelRanking: channels,
    nicheRanking: niches,
    contentRanking: content.slice(0, 10),
    formatRanking: formats,
    priorityRankings: rankings,
    opportunities: opportunities.slice(0, 8),
  };
}

function actionFromPriority(priority, videoId) {
  if (priority === "Arquivar") return "arquivar";
  if (videoId) return "reaproveitar";
  if (priority === "Produzir agora") return "produzir agora";
  return "testar com short";
}

function buildChannelRecommendations(input, score) {
  const out = [];
  if (score.production < 55) out.push("Aumentar producao: aprovar ideias e transformar em videos antes de expandir backlog.");
  if (score.seo < 55) out.push("Gerar ou revisar pacotes de SEO para os videos mais promissores.");
  if (score.originality < 60) out.push("Reforcar angulo proprio, fontes e [INPUT HUMANO] antes de publicar.");
  if (score.growth < 45 && input.longVideos > 0) out.push("Registrar metricas reais e estudar CTR/retencao dos videos publicados.");
  if (score.monetization >= 70) out.push("Priorizar este canal no ciclo atual, mantendo compliance e consistencia.");
  if (!out.length) out.push("Manter cadencia e comparar novos formatos com os melhores conteudos atuais.");
  return out;
}

function buildNicheRecommendations(input, score) {
  const out = [];
  if (score.potential >= 70 && score.difficulty < 65) out.push("Nicho promissor: criar mais ideias long-tail e testar formatos curtos derivados.");
  if (score.competition >= 70) out.push("Concorrencia alta: diferenciar com pesquisa original, fontes e recorte especifico.");
  if (score.monetization >= 70) out.push("Bom potencial relativo de monetizacao; priorizar sem prometer receita.");
  if (score.difficulty >= 70) out.push("Dificuldade alta: produzir primeiro conteudos de baixa complexidade e SEO long-tail.");
  if (!out.length) out.push("Acompanhar sinais de tendencia antes de aumentar volume de producao.");
  return out;
}

export function getIdeas(channelId = 1, format = null) {
  const db = getDb();
  const sql = format
    ? "SELECT * FROM ideas WHERE channel_id=? AND format=? ORDER BY score DESC"
    : "SELECT * FROM ideas WHERE channel_id=? ORDER BY score DESC";
  return format ? db.prepare(sql).all(channelId, format) : db.prepare(sql).all(channelId);
}

export function getVideos(channelId = 1) {
  // Métricas e thumbnails agregadas via subquery — evita a duplicação de
  // linhas que ocorria com LEFT JOIN quando há N métricas por vídeo (bug B1).
  return getDb().prepare(`
    SELECT v.*,
      (SELECT COALESCE(SUM(views),0)   FROM metrics WHERE video_id=v.id) AS views,
      (SELECT ROUND(AVG(ctr),1)        FROM metrics WHERE video_id=v.id) AS ctr,
      (SELECT ROUND(AVG(retention),1)  FROM metrics WHERE video_id=v.id) AS retention,
      (SELECT COALESCE(SUM(subs_gained),0) FROM metrics WHERE video_id=v.id) AS subs_gained,
      (SELECT overlay_text FROM thumbnails WHERE video_id=v.id ORDER BY id DESC LIMIT 1) AS overlay_text,
      (SELECT prompt       FROM thumbnails WHERE video_id=v.id ORDER BY id DESC LIMIT 1) AS thumb_prompt,
      (SELECT id           FROM media_assets WHERE video_id=v.id AND asset_type='thumbnail' AND file_name IS NOT NULL ORDER BY id DESC LIMIT 1) AS media_preview_id
    FROM videos v
    WHERE v.channel_id=? AND v.format='long'
    ORDER BY v.id DESC`).all(channelId)
    .map((v) => ({ ...v, hashtags: j(v.hashtags), tags: j(v.tags) }));
}

// --- Banco de ideias: leitura e mudança de status (Fase 1) ---

export function getIdeaById(id) {
  return getDb().prepare("SELECT * FROM ideas WHERE id=?").get(id);
}

const IDEA_STATUSES = ["idea", "approved", "rejected", "produced"];

// Atualiza o status de uma ideia (idea → approved → produced, ou rejected).
// Retorna a ideia atualizada ou null se o id não existir / status inválido.
export function setIdeaStatus(id, status) {
  if (!IDEA_STATUSES.includes(status)) return { error: "status inválido" };
  const db = getDb();
  const idea = db.prepare("SELECT * FROM ideas WHERE id=?").get(id);
  if (!idea) return null;
  db.prepare("UPDATE ideas SET status=? WHERE id=?").run(status, id);
  syncDb();
  return { ...idea, status };
}

// Ideias aprovadas que ainda não viraram vídeo — alimentam a Produção.
export function getProducibleIdeas(channelId = 1) {
  return getDb().prepare(`
    SELECT i.* FROM ideas i
    WHERE i.channel_id=? AND i.format='long' AND i.status='approved'
      AND NOT EXISTS (SELECT 1 FROM videos v WHERE v.idea_id=i.id AND v.format='long')
    ORDER BY i.score DESC`).all(channelId);
}

// Produz um vídeo completo a partir de uma ideia: insere o vídeo longo,
// a thumbnail, os shorts derivados, os posts sociais E o pacote de SEO —
// tudo numa transação. Recebe os pacotes já gerados pelas skills.
export function produceVideoFromIdea(channelId, idea, pkg, thumb, derivatives, seoPackage = null, extras = {}) {
  const db = getDb();
  const insVideo = db.prepare(`INSERT INTO videos
    (channel_id, idea_id, format, title, description, hashtags, tags, script, cta, variation_note, status, parent_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insThumb = db.prepare(`INSERT INTO thumbnails (video_id, prompt, overlay_text, visual_idea) VALUES (?,?,?,?)`);
  const insSocial = db.prepare(`INSERT INTO social_posts (video_id, platform, content) VALUES (?,?,?)`);
  const updIdea = db.prepare("UPDATE ideas SET status='produced' WHERE id=?");

  const tx = db.transaction(() => {
    const r = insVideo.run(
      channelId, idea.id, "long", pkg.title, pkg.description,
      JSON.stringify(pkg.hashtags), JSON.stringify(pkg.tags),
      pkg.script, pkg.cta, `Ângulo: ${idea.angle}`, "scripted", null
    );
    const videoId = r.lastInsertRowid;

    insThumb.run(videoId, thumb.prompt, thumb.overlay_text, thumb.visual_idea);

    let shorts = 0, posts = 0;
    for (const s of derivatives.shorts) {
      insVideo.run(channelId, idea.id, "short", s.angle, s.note, "[]", "[]", "", "", s.note, "pending", videoId);
      shorts++;
    }
    for (const p of derivatives.posts) {
      insSocial.run(videoId, p.platform, p.content);
      posts++;
    }
    updIdea.run(idea.id);

    if (seoPackage) saveSeoPackageTx(db, channelId, videoId, seoPackage);
    if (extras.thumbSet) saveThumbVariantsTx(db, videoId, extras.thumbSet);
    if (extras.distItems) saveDistributionsTx(db, channelId, videoId, extras.distItems, "rascunho");
    if (extras.libraryItems) for (const it of extras.libraryItems) insLibraryTx(db, channelId, it, videoId);

    logTx(db, channelId, "producao", pkg.title, "idea", "produced");
    for (const t of ["seo", "thumbnails", "distribuicao", "agendamento"]) enqueueTx(db, channelId, t, videoId);

    return { videoId, shorts, posts, seo: !!seoPackage, thumbVariants: extras.thumbSet ? extras.thumbSet.variants.length : 0 };
  });

  const result = tx();
  syncDb();
  return result;
}

// --- SEO Profissional: persistência e leitura ---

// Persiste um pacote de SEO de um vídeo (e suas keywords vinculadas).
// Reutilizável: roda dentro da transação de produção OU sozinho (on-demand).
function saveSeoPackageTx(db, channelId, videoId, seo) {
  // Remove pacote/keywords anteriores deste vídeo (regenerável sem duplicar).
  db.prepare("DELETE FROM seo_packages WHERE video_id=?").run(videoId);
  db.prepare("DELETE FROM keywords WHERE video_id=?").run(videoId);

  db.prepare(`INSERT INTO seo_packages
    (video_id, main_title, alt_titles, description, tags, hashtags, keywords, difficulty, potential, seo_score)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    videoId, seo.mainTitle, JSON.stringify(seo.altTitles), seo.description,
    JSON.stringify(seo.tags), JSON.stringify(seo.hashtags), JSON.stringify(seo.keywords),
    seo.difficulty, seo.potential, seo.seoScore
  );

  const insKw = db.prepare(`INSERT INTO keywords
    (channel_id, video_id, keyword, intent, search_volume, competition, difficulty, potential, trend, opportunity)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const k of seo.keywords) {
    insKw.run(channelId, videoId, k.keyword, k.intent, k.search_volume || 0, k.competition || 0,
      k.difficulty, k.potential, k.trend || "flat", k.opportunity || 0);
  }
}

// Salva (ou regenera) um pacote de SEO fora da produção — em transação própria.
export function saveSeoPackage(channelId, videoId, seo) {
  const db = getDb();
  db.transaction(() => saveSeoPackageTx(db, channelId, videoId, seo))();
  syncDb();
  return getSeoPackage(videoId);
}

export function getSeoPackage(videoId) {
  const row = getDb().prepare("SELECT * FROM seo_packages WHERE video_id=? ORDER BY id DESC LIMIT 1").get(videoId);
  if (!row) return null;
  return {
    ...row,
    alt_titles: j(row.alt_titles),
    tags: j(row.tags),
    hashtags: j(row.hashtags),
    keywords: j(row.keywords),
  };
}

// Keywords vinculadas a um vídeo (ordenadas por score SEO).
export function getKeywordsForVideo(videoId) {
  const rows = getDb().prepare(
    "SELECT * FROM keywords WHERE video_id=? ORDER BY potential DESC, difficulty ASC"
  ).all(videoId);
  return rows;
}

// Keywords relacionadas a uma ideia — casa pelo tópico da ideia no pool do canal.
export function getKeywordsForIdea(ideaId) {
  const db = getDb();
  const idea = db.prepare("SELECT channel_id, topic FROM ideas WHERE id=?").get(ideaId);
  if (!idea) return [];
  return db.prepare(
    "SELECT * FROM keywords WHERE channel_id=? AND keyword LIKE ? ORDER BY opportunity DESC LIMIT 20"
  ).all(idea.channel_id, `%${idea.topic}%`);
}

export function getVideoById(id) {
  return getDb().prepare("SELECT * FROM videos WHERE id=?").get(id);
}

export function getKeywords(channelId = 1) {
  // Pool do canal = keywords sem vídeo específico (video_id NULL).
  return getDb().prepare(
    "SELECT * FROM keywords WHERE channel_id=? AND video_id IS NULL ORDER BY opportunity DESC"
  ).all(channelId);
}

export function getStrategy(channelId = 1) {
  return getDb().prepare("SELECT * FROM strategy WHERE channel_id=? ORDER BY id").all(channelId)
    .map((s) => ({ ...s, actions: j(s.actions) }));
}

export function getMetricsForLearning(channelId = 1) {
  return getDb().prepare(`
    SELECT v.title, v.format, i.topic, m.ctr, m.retention, m.views, m.subs_gained
    FROM videos v
    JOIN metrics m ON m.video_id=v.id
    LEFT JOIN ideas i ON i.id=v.idea_id
    WHERE v.channel_id=?`).all(channelId);
}

// ============================================================
// Thumbnail Engine · Distribuição · Calendário · Logs · Filas · Biblioteca
// ============================================================

// --- Thumbnails (3 variações) ---
function saveThumbVariantsTx(db, videoId, set) {
  db.prepare("DELETE FROM thumb_variants WHERE video_id=?").run(videoId);
  const ins = db.prepare(`INSERT INTO thumb_variants
    (video_id, variant, main_text, alt_text, emotion, prompt, ctr_estimate, recommended)
    VALUES (?,?,?,?,?,?,?,?)`);
  for (const v of set.variants)
    ins.run(videoId, v.variant, v.main_text, v.alt_text, v.emotion, v.prompt, v.ctr_estimate, v.recommended ? 1 : 0);
}
export function saveThumbVariants(videoId, set) {
  const db = getDb();
  db.transaction(() => saveThumbVariantsTx(db, videoId, set))();
  syncDb();
  return getThumbVariants(videoId);
}
export function getThumbVariants(videoId) {
  return getDb().prepare("SELECT * FROM thumb_variants WHERE video_id=? ORDER BY variant").all(videoId);
}

// --- Distribuição multiplataforma ---
function saveDistributionsTx(db, channelId, videoId, items, status = "rascunho") {
  db.prepare("DELETE FROM distributions WHERE video_id=?").run(videoId);
  const ins = db.prepare(`INSERT INTO distributions
    (channel_id, video_id, platform, title, caption, hashtags, cta, format, checklist, status, scheduled_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  for (const it of items)
    ins.run(channelId, videoId, it.platform, it.title, it.caption,
      JSON.stringify(it.hashtags || []), it.cta, it.format, JSON.stringify(it.checklist || []), status, null);
}
export function saveDistributions(channelId, videoId, items, status = "rascunho") {
  const db = getDb();
  db.transaction(() => {
    saveDistributionsTx(db, channelId, videoId, items, status);
    logTx(db, channelId, "distribuicao", `vídeo #${videoId}`, null, status);
  })();
  syncDb();
  return getDistributionsForVideo(videoId);
}
const parseDist = (d) => ({ ...d, hashtags: j(d.hashtags), checklist: j(d.checklist) });
export function getDistributionsForVideo(videoId) {
  return getDb().prepare("SELECT * FROM distributions WHERE video_id=? ORDER BY id").all(videoId).map(parseDist);
}
export function getDistributions(channelId = 1) {
  return getDb().prepare(`
    SELECT d.*, v.title AS video_title FROM distributions d
    JOIN videos v ON v.id=d.video_id
    WHERE d.channel_id=? ORDER BY d.id DESC`).all(channelId).map(parseDist);
}
const DIST_STATUSES = ["rascunho", "pronto", "agendado", "publicado", "erro", "cancelado"];
export function updateDistribution(id, data = {}) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM distributions WHERE id=?").get(id);
  if (!row) return null;
  if (data.status && !DIST_STATUSES.includes(data.status)) return { error: "status inválido" };
  const status = data.status ?? row.status;
  const scheduled = data.scheduled_at !== undefined ? data.scheduled_at : row.scheduled_at;
  db.prepare("UPDATE distributions SET status=?, scheduled_at=? WHERE id=?").run(status, scheduled, id);
  logTx(db, row.channel_id, "agendamento", `${row.platform} · vídeo #${row.video_id}`, row.status, status);
  syncDb();
  return parseDist(db.prepare("SELECT * FROM distributions WHERE id=?").get(id));
}

// --- Calendário editorial (lê distribuições) ---
export function getCalendar(channelId = 1, platform = null) {
  const db = getDb();
  const sql = `SELECT d.*, v.title AS video_title FROM distributions d
    JOIN videos v ON v.id=d.video_id
    WHERE d.channel_id=? ${platform ? "AND d.platform=?" : ""}
    ORDER BY (d.scheduled_at IS NULL), d.scheduled_at, d.id`;
  const rows = platform ? db.prepare(sql).all(channelId, platform) : db.prepare(sql).all(channelId);
  return rows.map(parseDist);
}

// --- Logs ---
function logTx(db, channelId, action, entity, from, to) {
  db.prepare("INSERT INTO logs (channel_id, action, entity, status_from, status_to) VALUES (?,?,?,?,?)")
    .run(channelId, action, entity, from, to);
}
export function logAction(channelId, action, entity, from = null, to = null) {
  logTx(getDb(), channelId, action, entity, from, to);
}
export function getLogs(channelId = 1, limit = 100) {
  return getDb().prepare("SELECT * FROM logs WHERE channel_id=? ORDER BY id DESC LIMIT ?").all(channelId, limit);
}

// --- Filas ---
function enqueueTx(db, channelId, type, refId, status = "pendente") {
  db.prepare("INSERT INTO queues (channel_id, type, ref_id, status) VALUES (?,?,?,?)").run(channelId, type, refId, status);
}
export function enqueue(channelId, type, refId, status = "pendente") {
  enqueueTx(getDb(), channelId, type, refId, status);
}
export function getQueues(channelId = 1) {
  return getDb().prepare("SELECT * FROM queues WHERE channel_id=? ORDER BY id DESC LIMIT 100").all(channelId);
}
export function getQueueSummary(channelId = 1) {
  return getDb().prepare(`SELECT type,
      SUM(CASE WHEN status='pendente' THEN 1 ELSE 0 END) pendente,
      SUM(CASE WHEN status='concluido' THEN 1 ELSE 0 END) concluido,
      COUNT(*) total
    FROM queues WHERE channel_id=? GROUP BY type`).all(channelId);
}

// --- Biblioteca ---
function insLibraryTx(db, channelId, item, videoId = null) {
  db.prepare("INSERT INTO library_items (channel_id, type, title, content, video_id) VALUES (?,?,?,?,?)")
    .run(channelId, item.type, item.title, item.content, item.video_id ?? videoId);
}
export function addLibraryItem(channelId, item) {
  insLibraryTx(getDb(), channelId, item);
  syncDb();
}
export function getLibrary(channelId = 1, type = null) {
  const db = getDb();
  const sql = `SELECT * FROM library_items WHERE channel_id=? ${type ? "AND type=?" : ""} ORDER BY id DESC LIMIT 200`;
  return type ? db.prepare(sql).all(channelId, type) : db.prepare(sql).all(channelId);
}

export function getLibraryOverview(channelId = 1) {
  const db = getDb();
  return {
    videos: db.prepare(`SELECT id, title, status, created_at
      FROM videos WHERE channel_id=? AND format='long' ORDER BY id DESC LIMIT 100`).all(channelId),
    shorts: db.prepare(`SELECT id, title, status, parent_id, created_at
      FROM videos WHERE channel_id=? AND format='short' ORDER BY id DESC LIMIT 100`).all(channelId),
    posts: db.prepare(`SELECT sp.id, sp.platform, sp.content, sp.created_at, v.title video_title
      FROM social_posts sp JOIN videos v ON v.id=sp.video_id
      WHERE v.channel_id=? ORDER BY sp.id DESC LIMIT 100`).all(channelId),
    thumbnails: db.prepare(`SELECT tv.*, v.title video_title
      FROM thumb_variants tv JOIN videos v ON v.id=tv.video_id
      WHERE v.channel_id=? ORDER BY tv.id DESC LIMIT 100`).all(channelId),
    templates: getLibrary(channelId),
    mediaFactory: getMediaFactoryOverview(channelId),
    logs: getLogs(channelId, 100),
    queues: { summary: getQueueSummary(channelId), items: getQueues(channelId) },
  };
}

// --- AI Media Factory ---
function saveMediaAssetTx(db, channelId, videoId, asset = {}) {
  db.prepare(`INSERT INTO media_assets
    (channel_id, video_id, asset_type, platform, title, prompt, file_name, file_path, asset_mime, asset_content, metadata, status, risk_level)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    channelId,
    videoId,
    asset.asset_type,
    asset.platform || null,
    asset.title || null,
    asset.prompt || null,
    asset.file_name || null,
    asset.file_path || null,
    asset.asset_mime || null,
    asset.asset_content || null,
    asJson(asset.metadata || {}),
    asset.status || "prepared",
    asset.risk_level || "seguro"
  );
}

export function generateMediaFactoryForVideo(channelId, videoId) {
  const db = getDb();
  const video = db.prepare(`SELECT v.*, i.topic, i.angle, i.originality
    FROM videos v LEFT JOIN ideas i ON i.id=v.idea_id
    WHERE v.id=? AND v.channel_id=? AND v.format='long'`).get(videoId, channelId);
  if (!video) return null;
  const compliance = checkContent({
    title: video.title,
    description: video.description,
    hashtags: j(video.hashtags) || [],
    tags: j(video.tags) || [],
    originality: video.originality ?? 100,
  });
  const riskLevel = compliance.level;
  if (riskLevel === "alto risco") {
    enqueue(channelId, "revisao", videoId, "pendente");
    return { error: "Conteúdo de alto risco. Revise antes de preparar mídia IA.", riskLevel, issues: compliance.issues };
  }

  const pack = generateMediaFactoryPackage({
    ...video,
    hashtags: j(video.hashtags) || [],
    tags: j(video.tags) || [],
  });
  const localThumb = writeLocalThumbnailFiles({
    videoId,
    title: video.title,
    niche: video.topic || video.angle || "Canal Engine",
    score: video.originality || 82,
    style: pack.thumbnails?.[0]?.style || "Editorial premium original",
  });

  db.transaction(() => {
    db.prepare("DELETE FROM media_assets WHERE video_id=?").run(videoId);
    db.prepare("DELETE FROM library_items WHERE video_id=? AND type IN ('imagem_ia','thumbnail_ia','storyboard')").run(videoId);
    for (const item of pack.images) {
      saveMediaAssetTx(db, channelId, videoId, {
        asset_type: "image_prompt",
        platform: item.platform,
        title: item.title,
        prompt: item.mainPrompt,
        metadata: item,
        risk_level: riskLevel,
      });
      insLibraryTx(db, channelId, {
        type: "imagem_ia",
        title: item.title,
        content: `${item.mainPrompt}\n\nAlternativo: ${item.altPrompt}`,
      }, videoId);
    }
    for (const item of pack.thumbnails) {
      saveMediaAssetTx(db, channelId, videoId, {
        asset_type: "thumbnail",
        platform: "YouTube",
        title: `${item.classification} · ${item.main_text}`,
        prompt: item.prompt,
        file_name: item.classification === "melhor" ? localThumb.pngName : null,
        file_path: item.classification === "melhor" ? localThumb.pngPath : null,
        asset_mime: item.classification === "melhor" ? "image/png" : null,
        asset_content: item.classification === "melhor" ? localThumb.pngBase64 : null,
        metadata: { ...item, svgFile: localThumb.svgName, svgPath: localThumb.svgPath },
        risk_level: riskLevel,
      });
      insLibraryTx(db, channelId, {
        type: "thumbnail_ia",
        title: `${item.classification} · ${video.title}`,
        content: `${item.main_text}\n${item.prompt}${item.classification === "melhor" ? `\nArquivo: ${localThumb.pngPath}` : ""}`,
      }, videoId);
    }
    saveMediaAssetTx(db, channelId, videoId, {
      asset_type: "storyboard",
      platform: "Video IA",
      title: pack.storyboard.title,
      prompt: pack.videoPackage.prompt,
      metadata: pack.storyboard,
      risk_level: riskLevel,
    });
    insLibraryTx(db, channelId, { type: "storyboard", title: pack.storyboard.title, content: JSON.stringify(pack.storyboard, null, 2) }, videoId);
    for (const scene of pack.scenes) {
      saveMediaAssetTx(db, channelId, videoId, {
        asset_type: "scene",
        platform: "Video IA",
        title: scene.title,
        prompt: scene.visualPrompt,
        metadata: scene,
        risk_level: riskLevel,
      });
    }
    saveMediaAssetTx(db, channelId, videoId, {
      asset_type: "video_package",
      platform: "Veo/Kling/Runway/Pika",
      title: pack.videoPackage.title,
      prompt: pack.videoPackage.prompt,
      metadata: pack.videoPackage,
      status: "render_queue",
      risk_level: riskLevel,
    });
    for (const item of pack.shorts) {
      saveMediaAssetTx(db, channelId, videoId, {
        asset_type: "short_package",
        platform: item.platform,
        title: item.title,
        prompt: item.cut,
        metadata: item,
        status: "render_queue",
        risk_level: riskLevel,
      });
    }
    for (const item of pack.distribution) {
      saveMediaAssetTx(db, channelId, videoId, {
        asset_type: "distribution_package",
        platform: item.platform,
        title: item.title,
        prompt: item.caption,
        metadata: item,
        risk_level: riskLevel,
      });
    }
    enqueueTx(db, channelId, "media_factory", videoId, "pendente");
    enqueueTx(db, channelId, "renderizacao_ia", videoId, "pendente");
    logTx(db, channelId, "media_factory", video.title, null, "prepared");
  })();
  syncDb();

  return getMediaFactoryForVideo(channelId, videoId);
}

export function getMediaFactoryForVideo(channelId, videoId) {
  const rows = getDb().prepare(`SELECT * FROM media_assets
    WHERE channel_id=? AND video_id=? ORDER BY id`).all(channelId, videoId).map(parseMediaAsset);
  return groupMediaAssets(rows);
}

export function getMediaFactoryOverview(channelId = 1) {
  const rows = getDb().prepare(`SELECT ma.*, v.title video_title
    FROM media_assets ma JOIN videos v ON v.id=ma.video_id
    WHERE ma.channel_id=? ORDER BY ma.id DESC LIMIT 300`).all(channelId).map(parseMediaAsset);
  return {
    summary: getMediaFactorySummary(channelId),
    assets: rows,
    groups: groupMediaAssets(rows),
  };
}

export function getMediaFactorySummary(channelId = 1) {
  const db = getDb();
  const one = (type) => db.prepare("SELECT COUNT(*) c FROM media_assets WHERE channel_id=? AND asset_type=?").get(channelId, type).c;
  return {
    imagePrompts: one("image_prompt"),
    thumbnails: one("thumbnail"),
    storyboards: one("storyboard"),
    scenes: one("scene"),
    videoPackages: one("video_package"),
    shortPackages: one("short_package"),
    distributionPackages: one("distribution_package"),
    waitingRender: db.prepare("SELECT COUNT(*) c FROM media_assets WHERE channel_id=? AND status='render_queue'").get(channelId).c,
    review: db.prepare("SELECT COUNT(*) c FROM media_assets WHERE channel_id=? AND risk_level='revisar'").get(channelId).c,
  };
}

function parseMediaAsset(row) {
  return { ...row, metadata: j(row.metadata) };
}

function groupMediaAssets(rows) {
  return {
    images: rows.filter((r) => r.asset_type === "image_prompt"),
    thumbnails: rows.filter((r) => r.asset_type === "thumbnail"),
    storyboards: rows.filter((r) => r.asset_type === "storyboard"),
    scenes: rows.filter((r) => r.asset_type === "scene"),
    videos: rows.filter((r) => r.asset_type === "video_package"),
    shorts: rows.filter((r) => r.asset_type === "short_package"),
    distribution: rows.filter((r) => r.asset_type === "distribution_package"),
  };
}

const asJson = (value) => JSON.stringify(value ?? null);

export function createExecutionRun({ channelId, mode, limits, selected }) {
  const db = getDb();
  const r = db.prepare(`INSERT INTO execution_runs
    (channel_id, mode, status, limits_json, selected_json, actions_json, blocked_json, errors_json)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    channelId, mode, "running", asJson(limits), asJson(selected), "[]", "[]", "[]"
  );
  syncDb();
  return getExecutionRun(r.lastInsertRowid);
}

export function addExecutionStep(runId, name, status = "completed", details = null) {
  getDb().prepare("INSERT INTO execution_steps (run_id, name, status, details) VALUES (?,?,?,?)")
    .run(runId, name, status, details ? asJson(details) : null);
  syncDb();
}

export function finishExecutionRun(runId, { status = "completed", actions = [], blocked = [], errors = [], report = {} } = {}) {
  const db = getDb();
  db.prepare(`UPDATE execution_runs SET status=?, actions_json=?, blocked_json=?, errors_json=?, finished_at=datetime('now')
    WHERE id=?`).run(status, asJson(actions), asJson(blocked), asJson(errors), runId);
  const summary = report.summary || `Operação ${status === "completed" ? "concluída" : "finalizada"} no Canal Engine.`;
  db.prepare("INSERT INTO execution_reports (run_id, summary, report_json) VALUES (?,?,?)")
    .run(runId, summary, asJson(report));
  syncDb();
  return getExecutionReport(runId);
}

export function getExecutionRun(id) {
  const row = getDb().prepare("SELECT * FROM execution_runs WHERE id=?").get(id);
  return row ? parseExecutionRun(row) : null;
}

export function getExecutionHistory(limit = 20, workspaceId = null) {
  const db = getDb();
  const sql = workspaceId != null
    ? `SELECT er.* FROM execution_runs er
       JOIN channels c ON c.id=er.channel_id
       WHERE c.workspace_id=?
       ORDER BY er.id DESC LIMIT ?`
    : "SELECT * FROM execution_runs ORDER BY id DESC LIMIT ?";
  const rows = workspaceId != null ? db.prepare(sql).all(workspaceId, limit) : db.prepare(sql).all(limit);
  return rows.map(parseExecutionRun);
}

export function getExecutionStatus(workspaceId = null) {
  const db = getDb();
  const latest = workspaceId != null
    ? db.prepare(`SELECT er.* FROM execution_runs er
        JOIN channels c ON c.id=er.channel_id
        WHERE c.workspace_id=?
        ORDER BY er.id DESC LIMIT 1`).get(workspaceId)
    : db.prepare("SELECT * FROM execution_runs ORDER BY id DESC LIMIT 1").get();
  return latest ? parseExecutionRun(latest) : null;
}

export function getExecutionReport(id) {
  const db = getDb();
  const run = getExecutionRun(id);
  if (!run) return null;
  const steps = db.prepare("SELECT * FROM execution_steps WHERE run_id=? ORDER BY id").all(id)
    .map((s) => ({ ...s, details: j(s.details) }));
  const report = db.prepare("SELECT * FROM execution_reports WHERE run_id=? ORDER BY id DESC LIMIT 1").get(id);
  return { run, steps, report: report ? { ...report, report_json: j(report.report_json) } : null };
}

function parseExecutionRun(row) {
  return {
    ...row,
    limits: j(row.limits_json),
    selected: j(row.selected_json),
    actions: j(row.actions_json),
    blocked: j(row.blocked_json),
    errors: j(row.errors_json),
  };
}
