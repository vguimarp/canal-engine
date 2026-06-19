import { getDb } from "./db.js";
import { researchTrends } from "./skills/trends.js";
import { generateIdeas as localIdeas } from "./skills/ideas.js";
import { generateKeywords as localKeywords, buildSeoPackage as localSeo } from "./skills/seo.js";
import { generatePackage as localScript } from "./skills/script.js";
import { logEvent } from "./monitoring.js";

const PROVIDERS = ["openai", "claude", "gemini", "local"];

export function currentAIProvider() {
  const preferred = String(process.env.AI_PROVIDER || "openai").toLowerCase();
  if (preferred === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if ((preferred === "claude" || preferred === "anthropic") && process.env.ANTHROPIC_API_KEY) return "claude";
  if (preferred === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "local";
}

export function aiStatus() {
  return {
    active: currentAIProvider(),
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      local: true,
    },
  };
}

export class AIProvider {
  constructor({ workspaceId = null, userId = null, channelId = null } = {}) {
    this.workspaceId = workspaceId;
    this.userId = userId;
    this.channelId = channelId;
    this.provider = currentAIProvider();
  }

  async generateTrends(niche, count = 10) {
    return this.jsonTask("generateTrends", {
      niche, count,
      schema: "array of {topic, source, views, retention, ease, monetization}",
    }, () => researchTrends(niche, count), normalizeTrends);
  }

  async generateIdeas(niche, topics, opts = {}) {
    return this.jsonTask("generateIdeas", {
      niche, topics, longCount: opts.longCount || 5, shortCount: opts.shortCount || 10,
      schema: "array of {format, topic, angle, originality, views_potential, score, flagged}",
    }, () => localIdeas(niche, topics, opts), normalizeIdeas);
  }

  async generateKeywords(topics) {
    return this.jsonTask("generateKeywords", {
      topics,
      schema: "array of {keyword, intent, search_volume, competition, difficulty, potential, trend, opportunity}",
    }, () => localKeywords(topics), normalizeKeywords);
  }

  async generateSEO(idea, pkg = {}) {
    return this.jsonTask("generateSEO", {
      idea, package: pkg,
      schema: "object {mainTitle, altTitles, description, tags, hashtags, keywords, difficulty, potential, seoScore}",
    }, () => localSeo(idea, pkg), (x) => ({ ...localSeo(idea, pkg), ...(x || {}) }));
  }

  async generateScript(idea) {
    return this.jsonTask("generateScript", {
      idea,
      schema: "object {title, description, hashtags, tags, script, cta}",
    }, () => localScript(idea), (x) => ({ ...localScript(idea), ...(x || {}) }));
  }

  async jsonTask(task, input, fallback, normalize) {
    if (this.provider === "local") return this.record(task, fallback(), "local", input);
    const prompt = [
      "Você é o AIProvider do Canal Engine.",
      "Gere conteúdo original, seguro para monetização, sem copiar terceiros.",
      "Responda somente JSON válido.",
      `Tarefa: ${task}`,
      `Entrada: ${JSON.stringify(input)}`,
    ].join("\n");
    try {
      const raw = await this.callModel(prompt);
      const parsed = JSON.parse(extractJson(raw));
      return this.record(task, normalize(parsed), this.provider, input);
    } catch (error) {
      const safeError = sanitizeError(error.message);
      logEvent({ level: "warn", source: `ai.${task}`, message: "Fallback local usado após falha de IA.", workspaceId: this.workspaceId, userId: this.userId, context: { provider: this.provider, error: safeError } });
      return this.record(task, fallback(), "local-fallback", input, safeError);
    }
  }

  async callModel(prompt) {
    if (this.provider === "openai") return callOpenAI(prompt);
    if (this.provider === "claude") return callClaude(prompt);
    if (this.provider === "gemini") return callGemini(prompt);
    throw new Error("Provider de IA não configurado.");
  }

  record(task, result, provider, input, error = null) {
    try {
      getDb().prepare(`INSERT INTO ai_generations
        (workspace_id, user_id, channel_id, provider, task, prompt, result_json, status, error)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(
        this.workspaceId,
        this.userId,
        this.channelId,
        provider,
        task,
        JSON.stringify(input || {}),
        JSON.stringify(result || null),
        error ? "fallback" : "completed",
        error
      );
      // NÃO sincronizar aqui: a escrita já é write-through ao Turso e cada
      // db.sync() da réplica é caro (~6s). Sincronizar 3x por run-all estourava
      // o timeout (504). O batchWrite final já faz um sync único.
    } catch {}
    return result;
  }
}

async function callOpenAI(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "OpenAI falhou.");
  return data.choices?.[0]?.message?.content || "{}";
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Claude falhou.");
  return data.content?.map((p) => p.text).join("") || "{}";
}

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Gemini falhou.");
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "{}";
}

function extractJson(text = "") {
  const t = String(text).trim();
  if (t.startsWith("{") || t.startsWith("[")) return t;
  const match = t.match(/```json\s*([\s\S]*?)```/) || t.match(/```\s*([\s\S]*?)```/);
  return match ? match[1].trim() : t;
}

function normalizeTrends(value) {
  const rows = Array.isArray(value) ? value : value.trends || [];
  return rows.map((t) => ({
    topic: String(t.topic || "tema em validação"),
    source: t.source || "ai-provider",
    views: clamp(t.views ?? t.views_potential ?? 50),
    retention: clamp(t.retention ?? t.retention_pot ?? 50),
    ease: clamp(t.ease ?? t.production_ease ?? 50),
    monetization: clamp(t.monetization ?? 50),
    score: clamp(t.score ?? avg([t.views, t.retention, t.ease, t.monetization])),
  }));
}

function normalizeIdeas(value) {
  const rows = Array.isArray(value) ? value : value.ideas || [];
  return rows.map((i) => ({
    format: i.format === "short" ? "short" : "long",
    topic: String(i.topic || "tema"),
    angle: String(i.angle || i.title || "Ângulo original a validar"),
    originality: clamp(i.originality ?? 70),
    views_potential: clamp(i.views_potential ?? i.views ?? 60),
    score: clamp(i.score ?? 60),
    flagged: !!i.flagged || Number(i.originality || 70) < 50,
  }));
}

function normalizeKeywords(value) {
  const rows = Array.isArray(value) ? value : value.keywords || [];
  return rows.map((k) => ({
    keyword: String(k.keyword || "palavra-chave"),
    intent: k.intent || "informational",
    search_volume: Number(k.search_volume || 0),
    competition: clamp(k.competition ?? 50),
    difficulty: clamp(k.difficulty ?? 50),
    potential: clamp(k.potential ?? 50),
    trend: ["up", "flat", "down"].includes(k.trend) ? k.trend : "flat",
    opportunity: clamp(k.opportunity ?? k.potential ?? 50),
  }));
}

function clamp(n) { return Math.min(100, Math.max(0, Math.round(Number(n || 0)))); }
function avg(arr) { const nums = arr.map(Number).filter((n) => Number.isFinite(n)); return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 50; }
function sanitizeError(message = "") {
  return String(message)
    .replace(/sk-[A-Za-z0-9_\-]{8,}/g, "sk-***")
    .replace(/[A-Za-z0-9_\-]{12,}\*+[A-Za-z0-9_\-]{3,}/g, "***")
    .slice(0, 500);
}
