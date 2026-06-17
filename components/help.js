"use client";
import { useState } from "react";

// Caixa de dica amigável que pode ser fechada — explica cada tela em linguagem simples.
export function Dica({ children }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="border border-amber-dim bg-paper-2 p-4 mb-6 flex gap-3 items-start fade-in">
      <span className="text-amber text-lg leading-none mt-0.5">💡</span>
      <div className="flex-1 text-sm text-ink leading-relaxed">{children}</div>
      <button onClick={() => setOpen(false)}
        className="text-ink-dim hover:text-ink text-xs px-2" aria-label="Fechar dica">✕</button>
    </div>
  );
}

// Botão grande e claro para a ação principal de cada tela.
export function BotaoGrande({ onClick, loading, children, sub }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full md:w-auto group flex items-center gap-3 px-6 py-4 bg-amber text-paper hover:bg-ink transition-colors disabled:opacity-50">
      <span className="text-xl">{loading ? "⏳" : "▶"}</span>
      <span className="text-left">
        <span className="block text-sm font-bold tracking-wide uppercase">
          {loading ? "Trabalhando…" : children}
        </span>
        {sub && <span className="block text-[11px] opacity-80 normal-case font-normal">{sub}</span>}
      </span>
    </button>
  );
}

// Passo numerado para o guia inicial.
export function Passo({ n, titulo, children, feito }) {
  return (
    <div className="flex gap-4">
      <div className={`shrink-0 w-8 h-8 rounded-full grid place-items-center text-sm border ${
        feito ? "bg-ok border-ok text-paper" : "border-amber-dim text-amber"
      }`}>
        {feito ? "✓" : n}
      </div>
      <div className="pb-6">
        <div className="text-ink text-sm font-bold mb-1">{titulo}</div>
        <div className="text-ink-dim text-[13px] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
