"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChannelSwitcher } from "@/components/channel";

const NAV = [
  { href: "/", label: "Painel", code: "00" },
  { href: "/canais", label: "Canais", code: "01" },
  { href: "/ideas", label: "Ideias", code: "02" },
  { href: "/producao", label: "Produção", code: "03" },
  { href: "/seo", label: "SEO", code: "04" },
  { href: "/distribuicao", label: "Distribuição", code: "05" },
  { href: "/calendario", label: "Calendário", code: "06" },
  { href: "/biblioteca", label: "Biblioteca", code: "07" },
  { href: "/estrategia", label: "Estratégia", code: "08" },
  { href: "/execucao", label: "Execução", code: "09" },
];

export default function Nav() {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
    {/* Barra superior só no celular */}
    <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-paper border-b border-line flex items-center justify-between px-4 py-3">
      <span className="serif text-lg text-ink">Canal Engine</span>
      <button onClick={() => setMobileOpen((o) => !o)} className="text-amber text-2xl leading-none px-2" aria-label="Menu">
        {mobileOpen ? "✕" : "☰"}
      </button>
    </div>
    {mobileOpen && (
      <nav className="md:hidden fixed top-[52px] left-0 right-0 z-30 bg-paper-2 border-b border-line">
        <div className="px-5 py-3 border-b border-line"><ChannelSwitcher compact /></div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
            className={`block px-5 py-3 text-sm border-b border-line ${path === n.href ? "text-amber" : "text-ink"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    )}
    <aside className="w-56 shrink-0 border-r border-line min-h-screen p-5 sticky top-0 self-start hidden md:block relative z-10">
      <div className="mb-8">
        <div className="text-amber text-xs tracking-[0.3em] mb-1">DOSSIÊ</div>
        <div className="serif text-xl text-ink leading-tight">Canal<br />Engine</div>
        <div className="text-ink-dim text-[10px] mt-2 tracking-wider">CENTRAL DE INTELIGÊNCIA</div>
      </div>
      <ChannelSwitcher />
      <nav className="space-y-1">
        {NAV.map((n) => {
          const active = path === n.href;
          return (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors border-l-2 ${
                active ? "border-amber text-amber bg-paper-2" : "border-transparent text-ink-dim hover:text-ink hover:bg-paper-2"
              }`}>
              <span className="text-[10px] opacity-60">{n.code}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-10 pt-5 border-t border-line text-[10px] text-ink-dim leading-relaxed">
        <button onClick={() => { try { localStorage.removeItem("canal-engine:onboarded"); location.reload(); } catch {} }}
          className="text-amber hover:underline mb-3 block">↻ Rever tutorial</button>
        <span className="text-ok">●</span> Conformidade ativa<br />
        Política de conteúdo<br />autêntico (jul/2025)
      </div>
    </aside>
    </>
  );
}
