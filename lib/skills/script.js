// ============================================================
// SKILL: Roteiro & Metadados (Tarefa 3)
// Gera título, descrição, hashtags, tags, roteiro-RASCUNHO e CTA.
//
// O roteiro NÃO sai pronto para narração robótica. Sai como estrutura
// com marcações [INPUT HUMANO] obrigatórias — o que diferencia o vídeo
// e o mantém elegível para monetização.
//
// >>> ONDE PLUGAR API REAL <<<
// Troque os geradores por chamadas ao modelo de IA. Mantenha as
// marcações [INPUT HUMANO] no prompt para garantir originalidade.
// ============================================================

import { seeded, pick, slugify } from "./_shared.js";

const TITLE_PATTERNS = [
  (t) => `O mistério de ${t} que ninguém conseguiu explicar`,
  (t) => `${t}: a verdade por trás do caso`,
  (t) => `O que descobriram sobre ${t} mudou tudo`,
  (t) => `Por que ${t} ainda intriga especialistas`,
];

export function generatePackage(idea) {
  const rnd = seeded((idea.topic || "x").length + 7);
  const title = pick(TITLE_PATTERNS, rnd)(idea.topic);

  const description =
    `Neste vídeo: ${idea.angle}.\n\n` +
    `[INPUT HUMANO: adicione aqui sua introdução pessoal / por que escolheu este tema]\n\n` +
    `Capítulos:\n00:00 Introdução\n[INPUT HUMANO: timestamps reais após edição]\n\n` +
    `Fontes consultadas:\n[INPUT HUMANO: liste suas fontes — exigência de originalidade]\n\n` +
    `Inscreva-se para mais conteúdos como este.`;

  const baseTags = idea.topic.split(" ").filter((w) => w.length > 3);
  const hashtags = ["#curiosidades", "#misterios", "#documentario", `#${slugify(idea.topic).replace(/-/g, "")}`];
  const tags = [...baseTags, "curiosidades", "mistérios", "história", "fatos reais"];

  const script = buildScriptDraft(idea);

  const cta =
    "Se você chegou até aqui, deixa seu palpite nos comentários e se inscreve — " +
    "[INPUT HUMANO: personalize o CTA com algo específico deste vídeo].";

  return { title, description, hashtags, tags, script, cta };
}

function buildScriptDraft(idea) {
  return [
    `# ROTEIRO (RASCUNHO) — ${idea.topic}`,
    `Ângulo único: ${idea.angle}`,
    ``,
    `## Gancho (0–15s)`,
    `[INPUT HUMANO: abra com um fato/pergunta que SÓ este ângulo entrega]`,
    ``,
    `## Desenvolvimento`,
    `- Ponto 1: [estrutura sugerida] — [INPUT HUMANO: dado verificado + fonte]`,
    `- Ponto 2: [estrutura sugerida] — [INPUT HUMANO: dado verificado + fonte]`,
    `- Ponto 3: [estrutura sugerida] — [INPUT HUMANO: sua análise pessoal]`,
    ``,
    `## Clímax / revelação`,
    `[INPUT HUMANO: o insight central — precisa ser SEU, não genérico]`,
    ``,
    `## Encerramento + CTA`,
    `[INPUT HUMANO: conexão com o próximo vídeo]`,
    ``,
    `> Checklist anti-inautêntico: este roteiro tem ao menos 3 inputs humanos`,
    `> e um ângulo que nenhum outro vídeo do canal repetiu?`,
  ].join("\n");
}
