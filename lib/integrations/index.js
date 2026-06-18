// ============================================================
// Camada de integrações externas — PREPARAÇÃO (Fase 5).
// Hoje tudo roda com skills LOCAIS (heurísticas). Este módulo centraliza os
// "interruptores" de provedores futuros, sem fazer NENHUMA chamada paga.
// Quando uma chave existir no ambiente, o respectivo provedor fica "disponível";
// a troca real de implementação é feita nas skills, ponto a ponto.
// ============================================================

const env = (k) => (typeof process !== "undefined" ? process.env?.[k] : undefined);

export const integrations = {
  youtube: {
    available: !!env("YOUTUBE_API_KEY"),
    analytics: env("YOUTUBE_ANALYTICS_ENABLED") === "true",
  },
  text: {
    provider: env("AI_TEXT_PROVIDER") || "local", // local | openai | gemini
    openai: !!env("OPENAI_API_KEY"),
    gemini: !!env("GEMINI_API_KEY"),
  },
  media: {
    provider: env("MEDIA_PROVIDER") || "local", // local | veo | runway | kling
    veo: !!env("VEO_API_KEY"),
    runway: !!env("RUNWAY_API_KEY"),
    kling: !!env("KLING_API_KEY"),
  },
};

// Estado das integrações para exibir na UI (sem expor segredos).
export function integrationsStatus() {
  return {
    youtube: integrations.youtube.available ? "conectado" : "local (sem chave)",
    youtubeAnalytics: integrations.youtube.analytics ? "ativo" : "desligado",
    text: integrations.text.provider,
    media: integrations.media.provider,
  };
}

// Garante que nenhuma chamada paga aconteça enquanto o provedor for "local".
export function isLocalOnly() {
  return integrations.text.provider === "local" && integrations.media.provider === "local";
}
