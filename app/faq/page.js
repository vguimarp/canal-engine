export default function FaqPage() {
  const rows = [
    ["O Canal Engine promete receita?", "Não. Ele mostra potencial, prioridade e recomendações práticas."],
    ["O conteúdo é original?", "O fluxo foi desenhado para gerar ideias, roteiros e mídia original, com revisão humana recomendada."],
    ["Posso usar sem gateway?", "Sim. O plano FREE funciona; planos pagos exigem Stripe, Mercado Pago ou PIX configurado."],
    ["A IA real é obrigatória?", "Não. Sem chaves, o sistema usa fallback local para manter o produto funcionando."],
  ];
  return <Page title="FAQ" rows={rows} />;
}

function Page({ title, rows }) {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-paper text-ink">
      <div className="max-w-3xl mx-auto">
        <h1 className="serif text-4xl mb-6">{title}</h1>
        <div className="space-y-4">{rows.map(([q, a]) => <section key={q} className="border border-line bg-paper-2 p-5"><h2 className="text-ink mb-2">{q}</h2><p className="text-ink-dim text-sm">{a}</p></section>)}</div>
      </div>
    </main>
  );
}
