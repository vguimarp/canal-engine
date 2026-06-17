// ============================================================
// Utilitários compartilhados pelas skills da engine.
// ============================================================

// Média ponderada usada para ranquear tendências e ideias.
// Pesos refletem prioridade: views e retenção pesam mais.
export function weightedScore({ views = 0, retention = 0, ease = 0, monetization = 0 }) {
  const w = { views: 0.35, retention: 0.30, ease: 0.15, monetization: 0.20 };
  return Number(
    (views * w.views + retention * w.retention + ease * w.ease + monetization * w.monetization).toFixed(1)
  );
}

// Oportunidade de SEO: alto volume + baixa competição = alta oportunidade.
export function seoOpportunity(volume = 0, competition = 0) {
  // normaliza volume (log) e penaliza competição
  const volScore = Math.min(100, Math.log10(Math.max(1, volume)) * 20);
  return Number(Math.max(0, volScore - competition * 0.5).toFixed(1));
}

// Pseudo-aleatório determinístico por seed — resultados estáveis em demo.
export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function pick(arr, rnd = Math.random) {
  return arr[Math.floor(rnd() * arr.length)];
}

export function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
