import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="px-6 py-12 md:py-20 max-w-6xl mx-auto">
        <nav className="flex items-center justify-between mb-16">
          <div className="serif text-2xl">Canal Engine</div>
          <div className="flex gap-4 text-sm">
            <Link href="/pricing" className="text-ink-dim hover:text-ink">Preços</Link>
            <Link href="/login" className="text-amber">Entrar</Link>
          </div>
        </nav>
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div>
            <h1 className="serif text-5xl md:text-7xl leading-none mb-6">Canal Engine</h1>
            <p className="text-xl text-ink-dim leading-relaxed max-w-2xl">
              Uma central SaaS para descobrir ideias, produzir roteiros, gerar thumbnails locais, organizar SEO, exportar pacotes e operar canais com foco em crescimento.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/signup" className="bg-amber text-paper px-5 py-3 rounded-md text-sm font-bold uppercase tracking-wide">Criar conta grátis</Link>
              <Link href="/pricing" className="border border-line px-5 py-3 rounded-md text-sm uppercase tracking-wide text-ink-dim">Ver planos</Link>
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-5">
            {["Ideias com score", "Roteiros e SEO", "Thumbnail local", "Exportação Markdown", "Plano FREE com limites"].map((item) => (
              <div key={item} className="border-b border-line py-4 text-ink-dim last:border-b-0">{item}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
