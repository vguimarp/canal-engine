// ============================================================
// AI Media Factory
// Gera materiais originais para renderização futura por IA.
// Não baixa, copia ou reaproveita vídeos/imagens de terceiros.
// ============================================================

import { seeded, pick, slugify } from "./_shared.js";
import { generateThumbnailSet } from "./thumbnail.js";
import { generateDistribution } from "./distribute.js";

const VISUAL_STYLES = [
  "cinematográfico realista, luz natural controlada, composição limpa",
  "documental premium, textura editorial, contraste moderado",
  "3D semi-realista, profundidade, cores fortes sem parecer stock",
  "ilustração digital sofisticada, foco no assunto, fundo simples",
];

const EMOTIONS = ["curiosidade", "clareza", "surpresa", "confiança", "urgência leve"];

const IMAGE_SLOTS = [
  { type: "capa principal", ratio: "16:9", platform: "YouTube" },
  { type: "apoio visual", ratio: "16:9", platform: "Vídeo longo" },
  { type: "short vertical", ratio: "9:16", platform: "Shorts/TikTok/Reels/Kwai" },
  { type: "feed quadrado", ratio: "1:1", platform: "Instagram/Facebook Feed" },
  { type: "story vertical", ratio: "9:16", platform: "Instagram/Facebook Stories" },
];

const SHORT_PLATFORMS = [
  "youtube_shorts",
  "tiktok",
  "instagram_reels",
  "facebook_reels",
  "kwai",
];

export function generateImagePrompts(video = {}) {
  const rnd = seeded((video.title || "media").length + 71);
  const topic = video.topic || video.title || "tema do vídeo";
  return IMAGE_SLOTS.map((slot, i) => {
    const style = pick(VISUAL_STYLES, rnd);
    const emotion = pick(EMOTIONS, rnd);
    const base =
      `Imagem original sobre "${topic}". ${style}. Emoção: ${emotion}. ` +
      `Representar a ideia sem copiar pessoas, marcas, canais, frames ou obras protegidas. ` +
      `Sem texto embutido na imagem. Proporção ${slot.ratio}.`;
    return {
      title: `${slot.type} · ${topic}`,
      platform: slot.platform,
      ratio: slot.ratio,
      style,
      emotion,
      mainPrompt: base,
      altPrompt: `${base} Versão alternativa com enquadramento diferente e objeto central próprio.`,
      rank: i + 1,
    };
  });
}

export function generateAiThumbnails(video = {}) {
  const set = generateThumbnailSet(video);
  const sorted = [...set.variants].sort((a, b) => b.ctr_estimate - a.ctr_estimate);
  return sorted.map((item, i) => ({
    ...item,
    classification: i === 0 ? "melhor" : i === 1 ? "média" : "fraca",
  }));
}

export function generateStoryboard(video = {}) {
  const title = video.title || video.topic || "roteiro";
  const script = video.script || video.description || "";
  const beats = extractBeats(script, title);
  const scenes = beats.slice(0, 6).map((beat, i) => ({
    number: i + 1,
    title: `Cena ${i + 1}`,
    duration: i === 0 ? 8 : i === beats.length - 1 ? 10 : 12,
    narration: beat,
    visualPrompt:
      `Cena original para vídeo IA sobre "${title}". Momento: ${beat}. ` +
      `Visual cinematográfico, sem logotipos, sem celebridades, sem copiar imagens de terceiros.`,
    effects: i === 0 ? "entrada com movimento suave e foco no elemento principal" : "corte limpo, zoom leve e ritmo narrativo",
  }));
  return {
    title: `Storyboard · ${title}`,
    engineReady: ["Veo", "Kling", "Runway", "Pika"],
    totalDuration: scenes.reduce((s, c) => s + c.duration, 0),
    scenes,
  };
}

export function generateVideoPackage(video = {}) {
  const storyboard = generateStoryboard(video);
  return {
    title: `Pacote de vídeo IA · ${video.title || "vídeo"}`,
    status: "aguardando renderização",
    engines: storyboard.engineReady,
    ratio: "16:9",
    duration: storyboard.totalDuration,
    prompt:
      `Gerar vídeo original com base no storyboard "${storyboard.title}". ` +
      `Não usar trechos de terceiros, marcas, celebridades ou material protegido. Manter estilo autoral.`,
    scenes: storyboard.scenes,
  };
}

export function generateShortsFactory(video = {}) {
  const topic = video.topic || video.title || "tema";
  const baseTags = [`#${slugify(topic).replace(/-/g, "")}`, "#conteudooriginal", "#aprendizado"];
  const hooks = [
    `O detalhe que muda tudo sobre ${topic}`,
    `Você provavelmente não percebeu isto em ${topic}`,
    `A parte mais importante de ${topic}`,
    `Um erro comum quando falam de ${topic}`,
    `O resumo rápido de ${topic}`,
  ];
  return hooks.flatMap((hook, i) => {
    return SHORT_PLATFORMS.map((platform) => ({
      title: `${hook} · corte ${i + 1}`,
      platform,
      hook,
      cta: platform === "youtube_shorts" ? "Veja o vídeo completo no canal." : "Salve para ver depois.",
      hashtags: baseTags.slice(0, platform === "tiktok" ? 3 : 5),
      caption: `${hook}. Conteúdo original preparado a partir do roteiro principal.`,
      cut: `Corte ${i + 1}: selecionar trecho próprio do roteiro, sem material de terceiros.`,
      ratio: "9:16",
    }));
  });
}

export function generateMediaFactoryPackage(video = {}) {
  const images = generateImagePrompts(video);
  const thumbnails = generateAiThumbnails(video);
  const storyboard = generateStoryboard(video);
  const videoPackage = generateVideoPackage(video);
  const shorts = generateShortsFactory(video);
  const distribution = generateDistribution(video);
  return {
    images,
    thumbnails,
    storyboard,
    scenes: storyboard.scenes,
    videoPackage,
    shorts,
    distribution,
  };
}

function extractBeats(script, fallback) {
  const clean = String(script || "")
    .replace(/\[INPUT HUMANO:[^\]]+\]/g, "")
    .split(/\n+/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line.length > 24)
    .slice(0, 6);
  if (clean.length >= 4) return clean;
  return [
    `Abrir com pergunta forte sobre ${fallback}`,
    `Apresentar o contexto de forma simples e original`,
    `Mostrar o ponto principal com exemplo próprio`,
    `Explicar por que isso importa para a audiência`,
    `Fechar com resumo prático e chamada para o próximo conteúdo`,
  ];
}
