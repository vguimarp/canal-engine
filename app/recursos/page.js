import Link from "next/link";
import PublicNav from "@/components/PublicNav";

export const metadata = {
  title: "Recursos — Canal Engine",
  description: "Tudo que o Canal Engine faz: ideias com score, roteiros, SEO, thumbnails, exportação, multiplataforma e analytics.",
  openGraph: {
    title: "Recursos — Canal Engine",
    description: "Ideias, roteiros, SEO, thumbnails, exportação e distribuição multiplataforma numa só central.",
    type: "website",
  },
};

const FEATURES = [
  ["🧪", "Laboratório de nichos", "Crie vários canais e compare potencial de audiência e receita num ranking."],
  ["💡", "Ideias com score", "Geração de pautas com ângulo único e nota de originalidade anti-conteúdo-inautêntico."],
  ["📝", "Roteiros e SEO", "Título, descrição, tags, hashtags e palavras-chave com dificuldade e potencial."],
  ["🖼️", "Thumbnails", "Capa gerada localmente (PNG/SVG) com variações e CTR estimado; pronta para integrar IA de imagem."],
  ["📤", "Exportação", "Baixe o pacote do vídeo em Markdown e arquivos reais — pronto para publicar."],
  ["🌐", "Multiplataforma", "Adapte cada vídeo para YouTube, Shorts, TikTok, Reels, Facebook e Kwai."],
  ["📅", "Calendário editorial", "Agende e acompanhe publicações por canal e plataforma."],
  ["📊", "Analytics & monetização", "Ranking de canais/nichos e estimativa de receita para focar no que rende."],
];

export default function Recursos() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="px-6 py-10 md:py-16 max-w-6xl mx-auto">
        <PublicNav />
        <header className="mb-10">
          <div className="text-amber text-[11px] tracking-[0.3em] mb-2">RECURSOS</div>
          <h1 className="serif text-4xl md:text-5xl mb-3">Tudo para operar canais com método</h1>
          <p className="text-ink-dim text-lg max-w-2xl leading-relaxed">
            Da descoberta de nichos à exportação do pacote pronto — numa central simples, sem precisar saber programar.
          </p>
        </header>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} className="ce-card p-5">
              <div className="text-2xl mb-3">{icon}</div>
              <div className="text-ink text-sm font-bold mb-1">{title}</div>
              <div className="text-ink-dim text-[13px] leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/signup" className="bg-amber text-paper px-6 py-3 rounded-md text-sm font-bold uppercase tracking-wide">Começar gratuitamente</Link>
          <Link href="/pricing" className="border border-line px-6 py-3 rounded-md text-sm uppercase tracking-wide text-ink-dim">Ver planos</Link>
        </div>
      </section>
    </main>
  );
}
