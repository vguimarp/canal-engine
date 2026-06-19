import Link from "next/link";

// Menu superior profissional para páginas públicas (FASE 30).
const LINKS = [
  { href: "/", label: "Início" },
  { href: "/recursos", label: "Recursos" },
  { href: "/pricing", label: "Planos" },
  { href: "/faq", label: "FAQ" },
  { href: "/contato", label: "Contato" },
];

export default function PublicNav() {
  return (
    <>
      <nav className="flex items-center justify-between gap-3 mb-12 flex-wrap">
        <Link href="/" className="serif text-2xl text-ink">Canal Engine</Link>
        <div className="hidden md:flex items-center gap-5 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-dim hover:text-ink">{l.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-ink-dim hover:text-ink">Entrar</Link>
          <Link href="/signup" className="bg-amber text-paper px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wide">Criar conta</Link>
        </div>
      </nav>
      {/* Botão fixo "Teste grátis" (desktop e mobile) */}
      <Link href="/signup"
        className="fixed bottom-5 right-5 z-40 bg-amber text-paper px-5 py-3 rounded-full text-[12px] font-bold uppercase tracking-wide shadow-lg hover:bg-ink transition-colors">
        Teste grátis
      </Link>
    </>
  );
}
