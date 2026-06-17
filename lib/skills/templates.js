// ============================================================
// SKILL: Templates por plataforma (CTA, hashtags, descrição, checklist, formato)
// Base reutilizável para a Central Multiplataforma e a Biblioteca.
// 100% local — sem APIs externas.
// ============================================================

export const PLATFORMS = [
  { key: "youtube",          label: "YouTube",          kind: "long",  ratio: "16:9", maxLen: 5000 },
  { key: "youtube_shorts",   label: "YouTube Shorts",   kind: "short", ratio: "9:16", maxLen: 100 },
  { key: "tiktok",           label: "TikTok",           kind: "short", ratio: "9:16", maxLen: 150 },
  { key: "instagram_reels",  label: "Instagram Reels",  kind: "short", ratio: "9:16", maxLen: 125 },
  { key: "instagram_feed",   label: "Instagram Feed",   kind: "post",  ratio: "4:5",  maxLen: 200 },
  { key: "facebook_reels",   label: "Facebook Reels",   kind: "short", ratio: "9:16", maxLen: 150 },
  { key: "facebook_feed",    label: "Facebook Feed",    kind: "post",  ratio: "1:1",  maxLen: 250 },
  { key: "kwai",             label: "Kwai",             kind: "short", ratio: "9:16", maxLen: 120 },
];

export const PLATFORM_TEMPLATES = {
  youtube: {
    cta: "Inscreva-se e ative o sino para não perder os próximos.",
    hashtags: ["#youtube", "#documentario"],
    checklist: ["Título com keyword principal", "Thumbnail com texto forte", "Cards e tela final", "Capítulos na descrição"],
  },
  youtube_shorts: {
    cta: "Segue pra parte 2! 👇",
    hashtags: ["#shorts", "#viral"],
    checklist: ["Gancho nos primeiros 2s", "Texto na tela", "Loop no final", "≤ 60s"],
  },
  tiktok: {
    cta: "Comenta o que achou 👇 e segue pra mais!",
    hashtags: ["#fyp", "#viral", "#curiosidades"],
    checklist: ["Gancho imediato", "Legendas automáticas", "Trend de áudio", "Vertical 9:16"],
  },
  instagram_reels: {
    cta: "Salva esse Reel e compartilha! 💾",
    hashtags: ["#reels", "#explorar", "#curiosidades"],
    checklist: ["Capa chamativa", "Texto nos 3s iniciais", "Áudio em alta", "Vertical 9:16"],
  },
  instagram_feed: {
    cta: "Curtiu? Salva e marca alguém! 💬",
    hashtags: ["#instagram", "#conteudo"],
    checklist: ["Carrossel ou imagem forte", "1ª linha que prende", "CTA no fim", "4:5"],
  },
  facebook_reels: {
    cta: "Compartilhe com quem precisa ver isso!",
    hashtags: ["#facebookreels", "#viral"],
    checklist: ["Gancho forte", "Texto grande na tela", "Vertical 9:16"],
  },
  facebook_feed: {
    cta: "Deixe seu comentário e compartilhe 👇",
    hashtags: ["#facebook"],
    checklist: ["Primeira frase forte", "Imagem ou vídeo nativo", "CTA claro"],
  },
  kwai: {
    cta: "Segue aqui no Kwai pra mais! 🔥",
    hashtags: ["#kwai", "#viral"],
    checklist: ["Gancho rápido", "Conteúdo direto", "Vertical 9:16"],
  },
};

export function getPlatform(key) {
  return PLATFORMS.find((p) => p.key === key);
}
