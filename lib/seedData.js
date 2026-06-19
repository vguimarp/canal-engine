// ============================================================
// Lógica de seed compartilhada — usada pelo seed local (scripts/seed.mjs)
// e pela migração para o Turso (scripts/turso-migrate.mjs).
// Recebe um handle de banco já aberto (libsql/better-sqlite3, API síncrona)
// com o schema já aplicado. Não gerencia arquivo nem driver.
// ============================================================

import { researchTrends } from "./skills/trends.js";
import { generateIdeas } from "./skills/ideas.js";
import { generatePackage } from "./skills/script.js";
import { generateDerivatives } from "./skills/derivatives.js";
import { generateKeywords, buildSeoPackage } from "./skills/seo.js";
import { generateThumbnail } from "./skills/thumbnail.js";
import { generateStrategy } from "./skills/strategy.js";

export const DEMO_CHANNELS = [
  { name: "Arquivos do Inexplicável", niche: "Curiosidades e Mistérios", target_audience: "adultos curiosos 25-45",
    posting_frequency: "2 vídeos/semana", main_goal: "chegar a 100k inscritos com conteúdo original",
    strategy: "investigações originais com fontes verificadas", videos: 8, longs: 20, shorts: 40 },
  { name: "Histórias que Parecem Mentira", niche: "Histórias Inacreditáveis", target_audience: "público geral 18-55",
    posting_frequency: "3 vídeos/semana", main_goal: "viralizar com narrativas fortes",
    strategy: "storytelling emocional baseado em fatos reais", videos: 6, longs: 16, shorts: 30 },
  { name: "Dinheiro no Bolso", niche: "Finanças e Dinheiro", target_audience: "jovens adultos 22-40 querendo organizar a vida",
    posting_frequency: "2 vídeos/semana", main_goal: "autoridade em educação financeira",
    strategy: "dicas práticas e diretas, sem juridiquês", videos: 5, longs: 14, shorts: 24 },
  { name: "Futuro Agora", niche: "IA e Tecnologia", target_audience: "profissionais e entusiastas de tech 20-45",
    posting_frequency: "2 vídeos/semana", main_goal: "ser referência em IA aplicada no dia a dia",
    strategy: "explicar tecnologia complexa de forma simples e ética", videos: 4, longs: 12, shorts: 20 },
  { name: "Cantinho da Dona Cida", niche: "Dia de uma Aposentada", target_audience: "terceira idade e familiares 55+",
    posting_frequency: "1 vídeo/semana", main_goal: "comunidade acolhedora da terceira idade",
    strategy: "rotina leve, receitas e memórias com carinho", videos: 3, longs: 10, shorts: 16 },
];

// Tabelas na ordem de limpeza (filhas antes das pais).
const TABLES = [
  "seo_packages", "thumb_variants", "distributions", "social_posts", "metrics",
  "thumbnails", "keywords", "queues", "logs", "library_items", "learnings",
  "strategy", "videos", "ideas", "trends", "channels",
];

export function clearTables(db) {
  for (const t of TABLES) {
    try { db.exec(`DELETE FROM ${t}`); } catch { /* tabela pode não existir ainda */ }
  }
}

export function seedDatabase(db, { log = () => {} } = {}) {
  // Workspace demo (FASE 3) — dona dos 5 canais de exemplo.
  let demoWs = db.prepare("SELECT id FROM workspaces WHERE is_demo=1 ORDER BY id LIMIT 1").get();
  if (!demoWs) demoWs = { id: db.prepare("INSERT INTO workspaces (name, owner_user_id, is_demo) VALUES ('Demo', NULL, 1)").run().lastInsertRowid };
  const DEMO_WS = demoWs.id;

  const insChannel = db.prepare(`INSERT INTO channels
    (name, niche, description, target_audience, language, strategy, posting_frequency, main_goal, active, workspace_id, owner_user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,NULL)`);
  const insTrend = db.prepare(`INSERT INTO trends
    (channel_id, topic, source, views_potential, retention_pot, production_ease, monetization, score)
    VALUES (?,?,?,?,?,?,?,?)`);
  const insIdea = db.prepare(`INSERT INTO ideas
    (channel_id, format, topic, angle, originality, views_potential, score, status)
    VALUES (?,?,?,?,?,?,?,?)`);
  const insVideo = db.prepare(`INSERT INTO videos
    (channel_id, idea_id, format, title, description, hashtags, tags, script, cta, variation_note, status, parent_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insSocial = db.prepare(`INSERT INTO social_posts (video_id, platform, content) VALUES (?,?,?)`);
  const insThumb = db.prepare(`INSERT INTO thumbnails (video_id, prompt, overlay_text, visual_idea) VALUES (?,?,?,?)`);
  const insMetric = db.prepare(`INSERT INTO metrics (video_id, ctr, retention, views, subs_gained) VALUES (?,?,?,?,?)`);
  const insSeo = db.prepare(`INSERT INTO seo_packages
    (video_id, main_title, alt_titles, description, tags, hashtags, keywords, difficulty, potential, seo_score)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const insVideoKw = db.prepare(`INSERT INTO keywords
    (channel_id, video_id, keyword, intent, search_volume, competition, difficulty, potential, trend, opportunity)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const insKw = db.prepare(`INSERT INTO keywords
    (channel_id, video_id, keyword, intent, search_volume, competition, difficulty, potential, trend, opportunity)
    VALUES (?,NULL,?,?,?,?,?,?,?,?)`);
  const insStrat = db.prepare(`INSERT INTO strategy (channel_id, horizon, goal, actions) VALUES (?,?,?,?)`);
  const updIdeaProduced = db.prepare("UPDATE ideas SET status='produced' WHERE id=?");

  for (const cfg of DEMO_CHANNELS) {
    const channelId = insChannel.run(
      cfg.name, cfg.niche, cfg.strategy, cfg.target_audience, "pt-BR",
      cfg.strategy, cfg.posting_frequency, cfg.main_goal, 1, DEMO_WS
    ).lastInsertRowid;

    const trends = researchTrends(cfg.niche, 12);
    for (const t of trends) insTrend.run(channelId, t.topic, t.source, t.views, t.retention, t.ease, t.monetization, t.score);
    const topics = trends.map((t) => t.topic);

    const ideas = generateIdeas(cfg.niche, topics, { longCount: cfg.longs, shortCount: cfg.shorts });
    const ideaIds = ideas.map((i) => ({
      id: insIdea.run(channelId, i.format, i.topic, i.angle, i.originality, i.views_potential, i.score, "idea").lastInsertRowid,
      ...i,
    }));

    const topLongs = ideaIds.filter((i) => i.format === "long").sort((a, b) => b.score - a.score).slice(0, cfg.videos);
    let videoCount = 0, shortCount = 0, postCount = 0;
    for (const idea of topLongs) {
      const pkg = generatePackage(idea);
      const videoId = insVideo.run(
        channelId, idea.id, "long", pkg.title, pkg.description,
        JSON.stringify(pkg.hashtags), JSON.stringify(pkg.tags),
        pkg.script, pkg.cta, `Ângulo: ${idea.angle}`, "published", null
      ).lastInsertRowid;
      videoCount++;
      updIdeaProduced.run(idea.id);

      const thumb = generateThumbnail({ ...idea, title: pkg.title });
      insThumb.run(videoId, thumb.prompt, thumb.overlay_text, thumb.visual_idea);

      const seo = buildSeoPackage(idea, pkg);
      insSeo.run(videoId, seo.mainTitle, JSON.stringify(seo.altTitles), seo.description,
        JSON.stringify(seo.tags), JSON.stringify(seo.hashtags), JSON.stringify(seo.keywords),
        seo.difficulty, seo.potential, seo.seoScore);
      for (const k of seo.keywords)
        insVideoKw.run(channelId, videoId, k.keyword, k.intent, k.search_volume, k.competition, k.difficulty, k.potential, k.trend, k.opportunity);

      insMetric.run(videoId,
        Number((3 + Math.random() * 8).toFixed(1)),
        Number((35 + Math.random() * 45).toFixed(1)),
        Math.round(500 + Math.random() * 50000),
        Math.round(Math.random() * 300));

      const { shorts, posts } = generateDerivatives({ ...idea, title: pkg.title });
      for (const s of shorts) { insVideo.run(channelId, idea.id, "short", s.angle, s.note, "[]", "[]", "", "", s.note, "pending", videoId); shortCount++; }
      for (const p of posts) { insSocial.run(videoId, p.platform, p.content); postCount++; }
    }

    const keywords = generateKeywords(topics.slice(0, 6));
    for (const k of keywords) insKw.run(channelId, k.keyword, k.intent, k.search_volume, k.competition, k.difficulty, k.potential, k.trend, k.opportunity);
    for (const s of generateStrategy()) insStrat.run(channelId, s.horizon, s.goal, JSON.stringify(s.actions));

    log(`✓ [${channelId}] ${cfg.name} — ${ideas.length} ideias, ${videoCount} vídeos, ${shortCount} shorts, ${postCount} posts, ${keywords.length} keywords`);
  }
}
