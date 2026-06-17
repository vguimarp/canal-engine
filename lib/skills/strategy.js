// ============================================================
// SKILL: Estratégia (Tarefa 10)
// Planos de 30/90/180/365 dias. Metas ancoradas nos limiares REAIS
// do YouTube (1.000 inscritos + 4.000h, ou 10M views em Shorts) e na
// política de conteúdo autêntico — sem prometer monetização garantida.
// ============================================================

export function generateStrategy() {
  return [
    {
      horizon: "30d",
      goal: "Fundação: definir identidade e validar formato com originalidade",
      actions: [
        "Publicar 4–8 vídeos longos com ângulos genuinamente distintos",
        "Definir bumper/intro e identidade visual própria (anti-template)",
        "Testar 3 estilos de thumbnail e medir CTR",
        "Estabelecer rotina de revisão humana de cada roteiro",
      ],
    },
    {
      horizon: "90d",
      goal: "Tração: encontrar os temas que retêm audiência",
      actions: [
        "Analisar retenção e dobrar nos 2–3 temas vencedores",
        "Iniciar shorts derivados (recortes distintos, não clipes repetidos)",
        "Mirar limiar do YPP: 1.000 inscritos + 4.000h de exibição",
        "Construir banco de aprendizados (padrões de título/thumb que funcionam)",
      ],
    },
    {
      horizon: "180d",
      goal: "Escala sustentável: consistência sem cair em conteúdo inautêntico",
      actions: [
        "Solicitar monetização ao atingir limiares",
        "Padronizar produção mantendo variação real entre vídeos",
        "Avaliar abertura do 2º canal só após o 1º estar consistente",
        "Otimizar SEO com base em dados próprios de busca/impressões",
      ],
    },
    {
      horizon: "365d",
      goal: "Consolidação: crescimento composto e diversificação de receita",
      actions: [
        "Rumo a 100k inscritos via temas vencedores comprovados",
        "Diversificar receita (membros, patrocínios) além de AdSense",
        "Operar multicanal (até 3) com a mesma engine",
        "Revisar trimestralmente políticas do YouTube para manter conformidade",
      ],
    },
  ];
}
