// ============================================================
// SKILL: Tendências (Tarefa 1)
// Pesquisa temas em alta e ranqueia por potencial.
//
// >>> ONDE PLUGAR API REAL <<<
// Substitua fetchRawTrends() por chamadas a:
//   - YouTube Data API (videos.list / search.list mostMostPopular)
//   - Google Trends (via biblioteca não-oficial ou SerpAPI)
//   - Reddit / X para sinais sociais
// Mantenha o formato de retorno e o resto do pipeline funciona igual.
// ============================================================

import { weightedScore, seeded, pick } from "./_shared.js";

// Pool de sementes temáticas por nicho (demo). Na versão real isto some.
const SEED_TOPICS = {
  "Curiosidades e Mistérios": [
    "civilizações perdidas sob o oceano", "sinais de rádio do espaço sem explicação",
    "experimentos científicos que deram errado", "lugares que desaparecem dos mapas",
    "documentos desclassificados recentemente", "fenômenos naturais que a ciência não explica",
    "criaturas redescobertas após décadas extintas", "ilhas proibidas para visitantes",
    "tecnologias antigas avançadas demais para a época", "mensagens ocultas em obras famosas",
  ],
  "Histórias Inacreditáveis": [
    "sobreviventes que ficaram dias perdidos no mar", "pessoas que acordaram após anos em coma",
    "golpes geniais que enganaram o mundo", "heróis anônimos que mudaram vidas",
    "fugas impossíveis que deram certo", "fortunas perdidas e reencontradas",
    "coincidências que parecem ficção", "cartas entregues décadas depois",
    "encontros que mudaram a história", "promessas cumpridas após uma vida inteira",
  ],
  "Finanças e Dinheiro": [
    "como sair das dívidas em 12 meses", "investir do zero com pouco dinheiro",
    "erros que mantêm você pobre", "renda extra realista para começar hoje",
    "juros compostos explicados de forma simples", "como montar uma reserva de emergência",
    "hábitos financeiros de quem enriquece", "planejar a aposentadoria sem sofrer",
    "gastos invisíveis que sugam seu salário", "como negociar dívidas com desconto",
  ],
  "IA e Tecnologia": [
    "ferramentas de IA que economizam horas", "como a IA está mudando o trabalho",
    "automatizar tarefas chatas com IA", "o que vem depois dos chatbots",
    "IA para criar conteúdo de forma ética", "privacidade e dados na era da IA",
    "profissões que a IA vai transformar", "como usar IA para estudar melhor",
    "robôs no dia a dia mais perto do que parece", "mitos sobre inteligência artificial",
  ],
  "Dia de uma Aposentada": [
    "receitas simples para o almoço de domingo", "cuidar do jardim sem cansar",
    "exercícios leves para fazer em casa", "memórias de uma vida bem vivida",
    "dicas para uma rotina tranquila", "passeios baratos para a terceira idade",
    "como usar o celular sem medo", "artesanato fácil para relaxar",
    "saúde e bem-estar depois dos 60", "histórias de família para guardar",
  ],
};

// Placeholder — troque pelo fetch real.
function fetchRawTrends(niche, count) {
  const rnd = seeded(Date.now() % 100000);
  const pool = SEED_TOPICS[niche] || SEED_TOPICS["Curiosidades e Mistérios"];
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      topic: pick(pool, rnd),
      source: "demo-seed (substituir por API)",
      views: Math.round(40 + rnd() * 60),
      retention: Math.round(40 + rnd() * 60),
      ease: Math.round(30 + rnd() * 70),
      monetization: Math.round(40 + rnd() * 60),
    });
  }
  return out;
}

export function researchTrends(niche, count = 10) {
  return fetchRawTrends(niche, count).map((t) => ({
    ...t,
    score: weightedScore(t),
  })).sort((a, b) => b.score - a.score);
}
