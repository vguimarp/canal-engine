import Link from "next/link";

const PLANS = [
  ["FREE", "R$ 0", "1 canal, 20 ideias/mês e 5 execuções."],
  ["STARTER", "R$ 19/mês", "3 canais, 100 ideias/mês e 20 execuções."],
  ["PRO", "R$ 49/mês", "10 canais, ideias e execuções ilimitadas."],
  ["AGENCY", "R$ 149/mês", "Canais e workspaces ilimitados com prioridade."],
];

export default function PricingPage() {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-paper text-ink">
      <div className="max-w-6xl mx-auto">
        <div className="text-amber text-xs tracking-[0.3em] mb-2">CANAL ENGINE</div>
        <h1 className="serif text-4xl mb-3">Planos para crescer canais com IA</h1>
        <p className="text-ink-dim max-w-2xl mb-8">Escolha um plano, valide nichos e transforme ideias em produção, SEO, distribuição e calendário.</p>
        <div className="grid md:grid-cols-4 gap-4">
          {PLANS.map(([name, price, text]) => (
            <div key={name} className="border border-line bg-paper-2 p-5">
              <h2 className="text-2xl text-ink">{name}</h2>
              <div className="text-amber text-xl my-3">{price}</div>
              <p className="text-ink-dim text-sm min-h-16">{text}</p>
              <Link href={name === "FREE" ? "/signup" : `/billing/checkout?plan=${name.toLowerCase()}`} className="inline-block mt-5 text-[11px] uppercase tracking-wider text-amber">Começar</Link>
            </div>
          ))}
        </div>
        <div className="mt-8 flex gap-4 text-sm text-ink-dim">
          <Link href="/faq">FAQ</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
        </div>
      </div>
    </main>
  );
}
