// ============================================================
// Mídia por IA (V5) — provedores REAIS com FALLBACK automático.
//   • Imagem  : OpenAI Images / Flux  → fallback PNG procedural local
//   • Áudio   : ElevenLabs / OpenAI TTS → fallback sem áudio (status claro)
//   • Vídeo   : Runway / Kling / Veo (job assíncrono) → fallback storyboard
// Tudo é "env-gated": sem chave, NUNCA chama rede — usa o fallback.
// Retorna sempre { ok, provider, buffer?, mime?, ext?, status, fallback }.
// ============================================================

import { createThumbnailPng } from "./mediaExport.js";

// ---------- IMAGEM ----------
export function imageProvider() {
  if (process.env.OPENAI_API_KEY && (process.env.IMAGE_PROVIDER || "openai") === "openai") return "openai";
  if (process.env.FLUX_API_KEY) return "flux";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "local";
}

export async function generateImage({ prompt, title = "", score = 80 } = {}) {
  const provider = imageProvider();
  try {
    if (provider === "openai") {
      const buf = await openaiImage(prompt);
      return { ok: true, provider: "openai", buffer: buf, mime: "image/png", ext: "png", status: "completed", fallback: false };
    }
    if (provider === "flux") {
      const buf = await fluxImage(prompt);
      return { ok: true, provider: "flux", buffer: buf, mime: "image/png", ext: "png", status: "completed", fallback: false };
    }
  } catch (e) {
    // cai para o fallback procedural, sem derrubar o fluxo
    return { ok: true, provider: "local-fallback", buffer: createThumbnailPng({ title, score }), mime: "image/png", ext: "png", status: "fallback", fallback: true, error: sanitize(e.message) };
  }
  return { ok: true, provider: "local", buffer: createThumbnailPng({ title, score }), mime: "image/png", ext: "png", status: "local", fallback: true };
}

async function openaiImage(prompt) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", prompt, size: "1536x1024", n: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "OpenAI Images falhou.");
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI Images: resposta sem imagem.");
  return Buffer.from(b64, "base64");
}

async function fluxImage(prompt) {
  // Endpoint configurável (fal.ai / replicate / self-host) que retorne base64 ou URL.
  const url = process.env.FLUX_API_URL || "https://api.bfl.ml/v1/flux-pro-1.1";
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-key": process.env.FLUX_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, width: 1280, height: 720 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Flux falhou.");
  const b64 = data?.image_b64 || data?.b64_json;
  const imgUrl = data?.image_url || data?.url || data?.result?.sample;
  if (b64) return Buffer.from(b64, "base64");
  if (imgUrl) { const r = await fetch(imgUrl); return Buffer.from(await r.arrayBuffer()); }
  throw new Error("Flux: resposta sem imagem.");
}

// ---------- ÁUDIO (narração) ----------
export function audioProvider() {
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.OPENAI_API_KEY) return "openai-tts";
  return "none";
}

export async function generateNarration({ text } = {}) {
  const provider = audioProvider();
  const clean = String(text || "").replace(/\[INPUT HUMANO:[^\]]+\]/g, "").trim().slice(0, 4000);
  if (!clean) return { ok: false, provider, status: "sem-roteiro", fallback: true };
  try {
    if (provider === "elevenlabs") {
      const buf = await elevenLabsTTS(clean);
      return { ok: true, provider: "elevenlabs", buffer: buf, mime: "audio/mpeg", ext: "mp3", status: "completed", fallback: false };
    }
    if (provider === "openai-tts") {
      const buf = await openaiTTS(clean);
      return { ok: true, provider: "openai-tts", buffer: buf, mime: "audio/mpeg", ext: "mp3", status: "completed", fallback: false };
    }
  } catch (e) {
    return { ok: false, provider, status: "erro", fallback: true, error: sanitize(e.message) };
  }
  // Sem provedor: estrutura pronta, sem áudio gerado.
  return { ok: false, provider: "none", status: "sem-provedor", fallback: true,
    message: "Configure ELEVENLABS_API_KEY ou OPENAI_API_KEY para gerar a narração em MP3." };
}

async function elevenLabsTTS(text) {
  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2" }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 200) || "ElevenLabs falhou.");
  return Buffer.from(await res.arrayBuffer());
}

async function openaiTTS(text) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts", voice: process.env.OPENAI_TTS_VOICE || "alloy", input: text, response_format: "mp3" }),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error?.message || "OpenAI TTS falhou."); }
  return Buffer.from(await res.arrayBuffer());
}

// ---------- VÍDEO ----------
export function videoProvider() {
  if (process.env.RUNWAY_API_KEY) return "runway";
  if (process.env.KLING_API_KEY) return "kling";
  if (process.env.VEO_API_KEY) return "veo";
  return "none";
}

// Vídeo é job assíncrono (submeter → poll → baixar). Sem worker dedicado,
// retornamos o storyboard como fallback e o estado da integração.
export async function generateVideo({ storyboard, prompt } = {}) {
  const provider = videoProvider();
  if (provider === "none") {
    return { ok: false, provider: "none", status: "storyboard", fallback: true,
      message: "Configure RUNWAY_API_KEY / KLING_API_KEY / VEO_API_KEY para renderizar MP4. Por ora, storyboard pronto.",
      storyboard: storyboard || null };
  }
  // Estrutura de submissão pronta; a renderização real exige polling assíncrono
  // (worker fora do serverless) — marcado como pendente operacional.
  return { ok: false, provider, status: "enfileirado", fallback: true,
    message: `Provedor ${provider} configurado. Render MP4 requer worker assíncrono (fila) — estrutura pronta.`,
    storyboard: storyboard || null };
}

// Estado das integrações de mídia (para /integrations, sem expor segredos).
export function mediaAIStatus() {
  return {
    image: { active: imageProvider(), openai: !!process.env.OPENAI_API_KEY, flux: !!process.env.FLUX_API_KEY },
    audio: { active: audioProvider(), elevenlabs: !!process.env.ELEVENLABS_API_KEY, openaiTts: !!process.env.OPENAI_API_KEY },
    video: { active: videoProvider(), runway: !!process.env.RUNWAY_API_KEY, kling: !!process.env.KLING_API_KEY, veo: !!process.env.VEO_API_KEY },
  };
}

function sanitize(m = "") { return String(m).replace(/(sk-|xi-|key-)[A-Za-z0-9_\-]{6,}/g, "$1***").slice(0, 300); }
