// ============================================================
// SKILL: Derivados (Tarefa 4)
// Para cada vídeo longo gera 5 shorts + 5 posts de redes sociais.
// Cada short é um RECORTE DISTINTO (momento, ângulo ou gancho próprio)
// — não o mesmo clipe replicado, o que violaria a regra de originalidade.
// ============================================================

import { seeded, pick } from "./_shared.js";

const SHORT_HOOKS = [
  "O detalhe que passou despercebido em",
  "3 segundos que mudam como você vê",
  "A pergunta sem resposta sobre",
  "O que cortaram da história de",
  "Ninguém esperava isto sobre",
];

const POST_FORMATS = [
  (t) => `📌 Você sabia? ${t}. [INPUT HUMANO: 1 fato + fonte]`,
  (t) => `Enquete: o que você acha sobre ${t}? Comenta aqui 👇`,
  (t) => `Carrossel (5 cards): a história de ${t} em partes. [INPUT HUMANO: roteiro dos cards]`,
  (t) => `Bastidores: por que escolhi falar sobre ${t}. [INPUT HUMANO: pessoal]`,
  (t) => `Teaser do vídeo novo sobre ${t} — link na bio.`,
];

export function generateDerivatives(video) {
  const rnd = seeded((video.title || "x").length + 13);
  const topic = video.topic || video.title || "o tema";

  const shorts = Array.from({ length: 5 }, (_, i) => ({
    format: "short",
    angle: `${pick(SHORT_HOOKS, rnd)} ${topic}`,
    note: `Recorte ${i + 1}: momento distinto do vídeo longo — [INPUT HUMANO: marque o trecho exato]`,
  }));

  const posts = POST_FORMATS.map((fn, i) => ({
    platform: ["instagram", "tiktok", "x", "instagram", "tiktok"][i],
    content: fn(topic),
  }));

  return { shorts, posts };
}
