// ============================================================
// SKILL: Análise de Monetização
// Estima potencial de receita por nicho, canal e vídeo (heurístico, em BRL).
// Aponta onde concentrar produção para crescer receita mais rápido.
// NÃO promete receita real — é uma priorização relativa.
// ============================================================

// RPM estimado por nicho (R$ por 1.000 views) — ordens de grandeza de mercado BR.
export const NICHE_RPM = {
  "Finanças e Dinheiro": 18.0,
  "IA e Tecnologia": 12.0,
  "Curiosidades e Mistérios": 6.0,
  "Histórias Inacreditáveis": 5.0,
  "Dia de uma Aposentada": 4.0,
};
const DEFAULT_RPM = 6.0;

export function nicheRpm(niche) {
  return NICHE_RPM[niche] ?? DEFAULT_RPM;
}

// Receita estimada de um vídeo a partir das views e do nicho.
export function videoRevenue(views = 0, niche) {
  return Number(((views / 1000) * nicheRpm(niche)).toFixed(2));
}

// Potencial de monetização do canal (0-100): combina RPM do nicho,
// volume de execução (vídeos) e qualidade média das ideias.
export function channelMonetizationPotential({ longVideos = 0, avgScore = 0 } = {}, niche) {
  const rpm = nicheRpm(niche);
  const rpmScore = Math.min(100, (rpm / 18) * 100);          // nicho mais rentável = 100
  const execScore = Math.min(100, longVideos * 8);            // execução
  const qualityScore = avgScore;                             // qualidade das ideias
  return Number((rpmScore * 0.5 + execScore * 0.25 + qualityScore * 0.25).toFixed(1));
}

// Classifica prioridade a partir do potencial.
export function priorityLabel(potential) {
  if (potential >= 70) return "prioritário";
  if (potential >= 45) return "promissor";
  return "observar";
}
