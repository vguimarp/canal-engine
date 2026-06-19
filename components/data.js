"use client";
import { useEffect, useState, useCallback } from "react";

// Fetch resiliente: NUNCA lança. Em erro/timeout/JSON inválido, retorna o
// fallback — evita "loader eterno" e crashes de .json() em respostas 500/504.
export async function safeJson(url, opts, fallback = null) {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) return { __error: `HTTP ${r.status}`, __status: r.status, __fallback: fallback ?? null } ?? fallback;
    const text = await r.text();
    if (!text) return fallback;
    try { return JSON.parse(text); } catch { return fallback; }
  } catch (e) {
    return { __error: e?.message || "rede", __fallback: fallback ?? null };
  }
}

// Hook de carregamento com estados claros: loading | error | data.
// loader() deve retornar os dados (ou lançar). Recarrega quando `deps` muda.
export function useLoader(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      setState({ loading: false, error: null, data });
    } catch (e) {
      setState({ loading: false, error: e?.message || "Falha ao carregar.", data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

// Bloco visual padrão de estado (carregando / erro / vazio).
export function StateBlock({ loading, error, empty, emptyText = "Nada por aqui ainda.", onRetry, children }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-dim text-sm py-8 justify-center fade-in">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-amber border-t-transparent animate-spin" />
        Carregando…
      </div>
    );
  }
  if (error) {
    return (
      <div className="border border-alert bg-paper-2 p-4 text-sm text-alert fade-in">
        ⚠ Não foi possível carregar agora. {String(error)}
        {onRetry && (
          <button onClick={onRetry} className="ml-2 underline text-amber">tentar de novo</button>
        )}
      </div>
    );
  }
  if (empty) {
    return <div className="text-ink-dim text-sm py-6">{emptyText}</div>;
  }
  return children;
}
