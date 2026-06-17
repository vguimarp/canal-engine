"use client";
import { useEffect, useState, useCallback } from "react";

// Estado de "canal ativo" compartilhado entre as telas, sem backend de sessão
// (preparado para, no futuro SaaS, virar contexto por usuário autenticado).
const KEY = "canal-engine:activeChannel";

export function getActiveChannelId() {
  if (typeof window === "undefined") return 1;
  return Number(window.localStorage.getItem(KEY) || 1);
}

export function useActiveChannel() {
  const [id, setId] = useState(1);
  useEffect(() => {
    setId(getActiveChannelId());
    const onChange = () => setId(getActiveChannelId());
    window.addEventListener("activechannel", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("activechannel", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const change = useCallback((newId) => {
    window.localStorage.setItem(KEY, String(newId));
    window.dispatchEvent(new Event("activechannel"));
  }, []);
  return [id, change];
}

// Seletor de canal ativo — usado na barra lateral e no topo mobile.
export function ChannelSwitcher({ compact }) {
  const [active, setActive] = useActiveChannel();
  const [channels, setChannels] = useState([]);

  const load = () => fetch("/api/channels").then((r) => r.json()).then((cs) => setChannels(cs || []));
  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("channels:changed", onChange);
    return () => window.removeEventListener("channels:changed", onChange);
  }, []);

  // Se o canal ativo não existir mais, cai para o primeiro disponível.
  useEffect(() => {
    if (channels.length && !channels.some((c) => c.id === active)) setActive(channels[0].id);
  }, [channels, active, setActive]);

  const current = channels.find((c) => c.id === active);

  return (
    <div className={compact ? "" : "mb-6"}>
      {!compact && <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-1.5">Canal ativo</div>}
      <div className="relative">
        <select
          value={active}
          onChange={(e) => setActive(Number(e.target.value))}
          className="w-full appearance-none bg-paper-2 border border-line text-ink text-sm pl-3 pr-8 py-2 hover:border-amber-dim focus:border-amber outline-none cursor-pointer">
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.active ? "" : " (inativo)"}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber text-xs">▾</span>
      </div>
      {!compact && current && (
        <div className="text-ink-dim text-[10px] mt-1.5 truncate">{current.niche}</div>
      )}
    </div>
  );
}
