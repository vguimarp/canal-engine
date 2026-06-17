"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Stat, Tag, Bar, GenButton } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

const EMPTY = {
  name: "", niche: "", target_audience: "", language: "pt-BR",
  strategy: "", posting_frequency: "", main_goal: "", active: 1,
};

export default function Canais() {
  const [active, setActive] = useActiveChannel();
  const [channels, setChannels] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const cs = await fetch("/api/channels").then((r) => r.json());
    setChannels(cs || []);
  };
  useEffect(() => { load(); }, []);

  const refresh = () => { load(); window.dispatchEvent(new Event("channels:changed")); };

  const save = async (form) => {
    setBusy(true);
    if (editing === "new") {
      const c = await fetch("/api/channels", { method: "POST", body: JSON.stringify(form) }).then((r) => r.json());
      if (c?.id) setActive(c.id);
    } else {
      await fetch(`/api/channels/${editing}`, { method: "PATCH", body: JSON.stringify(form) });
    }
    setBusy(false); setEditing(null); refresh();
  };

  const toggleActive = async (c) => {
    await fetch(`/api/channels/${c.id}`, { method: "PATCH", body: JSON.stringify({ active: c.active ? 0 : 1 }) });
    refresh();
  };

  const best = channels[0]; // já vem ordenado por potencial desc
  const totals = channels.reduce((a, c) => ({
    ideas: a.ideas + c.stats.ideas, videos: a.videos + c.stats.longVideos, shorts: a.shorts + c.stats.shorts,
  }), { ideas: 0, videos: 0, shorts: 0 });

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 01 — PORTFÓLIO" title="Seus Canais">
          Gerencie, compare e teste vários canais para descobrir qual nicho tem mais potencial.
          O canal selecionado aqui passa a valer em todas as telas.
        </PageHead>

        <Dica>
          Crie até alguns canais com nichos diferentes e veja qual rende mais ideias, vídeos e
          melhor potencial. Clique em <strong>Tornar ativo</strong> num canal para trabalhar nele
          nas abas Ideias, Produção, SEO e Estratégia.
        </Dica>

        {/* Visão geral multi-canal */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Canais" value={channels.length} accent />
          <Stat label="Ideias (todos)" value={totals.ideas} />
          <Stat label="Vídeos (todos)" value={totals.videos} />
          <Stat label="Melhor potencial" value={best ? best.stats.potential : "—"} sub={best?.name} />
        </div>

        <div className="flex justify-end mb-4">
          <GenButton onClick={() => setEditing(editing === "new" ? null : "new")}>
            {editing === "new" ? "Cancelar" : "+ Novo canal"}
          </GenButton>
        </div>

        {editing === "new" && (
          <div className="mb-6">
            <ChannelForm initial={EMPTY} busy={busy} onSave={save} onCancel={() => setEditing(null)} title="Criar canal" />
          </div>
        )}

        {/* Cards dos canais */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {channels.map((c) => (
            <div key={c.id} className={`border bg-paper-2 ${c.id === active ? "border-amber" : "border-line"}`}>
              {editing === c.id ? (
                <div className="p-4">
                  <ChannelForm initial={c} busy={busy} onSave={save} onCancel={() => setEditing(null)} title="Editar canal" />
                </div>
              ) : (
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {c.id === active && <Tag tone="ok">ativo agora</Tag>}
                        <Tag tone={c.active ? "ok" : "alert"}>{c.active ? "habilitado" : "pausado"}</Tag>
                      </div>
                      <div className="serif text-xl text-ink truncate">{c.name}</div>
                      <div className="text-ink-dim text-[12px]">{c.niche}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-amber text-2xl">{c.stats.potential}</div>
                      <div className="text-ink-dim text-[10px]">potencial</div>
                    </div>
                  </div>

                  {c.target_audience && <div className="text-ink-dim text-[12px] mb-3">🎯 {c.target_audience}</div>}

                  <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                    {[["Ideias", c.stats.ideas], ["Vídeos", c.stats.longVideos], ["Shorts", c.stats.shorts], ["Score", c.stats.avgScore]].map(([l, v]) => (
                      <div key={l} className="border border-line py-2">
                        <div className="text-ink text-sm">{v}</div>
                        <div className="text-ink-dim text-[9px] uppercase tracking-wide">{l}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {c.id !== active
                      ? <Act onClick={() => setActive(c.id)} tone="amber">Tornar ativo</Act>
                      : <span className="text-ok text-[11px] self-center">✓ Você está neste canal</span>}
                    <Act onClick={() => setEditing(c.id)}>Editar</Act>
                    <Act onClick={() => toggleActive(c)}>{c.active ? "Pausar" : "Reativar"}</Act>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparação / ranking */}
        <Panel title="Comparação entre canais (ranking por potencial)">
          {channels.length === 0 ? (
            <div className="text-ink-dim text-sm">Nenhum canal ainda.</div>
          ) : (
            <div className="space-y-4">
              {channels.map((c, i) => (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink truncate pr-3">
                      <span className="text-ink-dim mr-2">{i + 1}º</span>{c.name}
                    </span>
                    <span className="text-amber shrink-0">{c.stats.potential}</span>
                  </div>
                  <Bar value={c.stats.potential} max={best?.stats.potential || 100} />
                  <div className="flex gap-4 text-ink-dim text-[10px] mt-1">
                    <span>{c.stats.ideas} ideias</span>
                    <span>{c.stats.longVideos} vídeos</span>
                    <span>{c.stats.shorts} shorts</span>
                    <span>score {c.stats.avgScore}</span>
                    <span>orig. {c.stats.avgOriginality}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </Shell>
    </div>
  );
}

function Act({ onClick, children, tone }) {
  const c = tone === "amber" ? "border-amber text-amber hover:bg-amber hover:text-paper" : "border-line text-ink-dim hover:text-ink";
  return (
    <button onClick={onClick}
      className={`text-[11px] tracking-wider uppercase px-3 py-1.5 border transition-colors ${c}`}>
      {children}
    </button>
  );
}

function ChannelForm({ initial, onSave, onCancel, busy, title }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && form.niche.trim();

  const field = (label, key, placeholder) => (
    <label className="block">
      <span className="text-ink-dim text-[10px] tracking-widest uppercase">{label}</span>
      <input value={form[key] || ""} onChange={set(key)} placeholder={placeholder}
        className="mt-1 w-full bg-paper border border-line text-ink text-sm px-3 py-2 focus:border-amber outline-none" />
    </label>
  );

  return (
    <div className="border border-amber-dim bg-paper-2 p-5">
      <div className="text-amber text-[11px] tracking-widest uppercase mb-4">{title}</div>
      <div className="grid md:grid-cols-2 gap-3">
        {field("Nome", "name", "Ex.: Arquivos do Inexplicável")}
        {field("Nicho", "niche", "Ex.: Curiosidades e Mistérios")}
        {field("Público-alvo", "target_audience", "Ex.: adultos curiosos 25-45")}
        {field("Idioma", "language", "pt-BR")}
        {field("Frequência de postagem", "posting_frequency", "Ex.: 2 vídeos/semana")}
        {field("Objetivo principal", "main_goal", "Ex.: chegar a 10k inscritos")}
      </div>
      <label className="block mt-3">
        <span className="text-ink-dim text-[10px] tracking-widest uppercase">Estratégia</span>
        <textarea value={form.strategy || ""} onChange={set("strategy")} rows={2}
          placeholder="Ex.: investigações originais com fontes verificadas"
          className="mt-1 w-full bg-paper border border-line text-ink text-sm px-3 py-2 focus:border-amber outline-none resize-none" />
      </label>
      <div className="flex gap-2 mt-4">
        <button onClick={() => valid && onSave(form)} disabled={!valid || busy}
          className="text-[11px] tracking-wider uppercase px-4 py-2 border border-amber text-amber hover:bg-amber hover:text-paper transition-colors disabled:opacity-40">
          {busy ? "Salvando…" : "Salvar"}
        </button>
        <button onClick={onCancel}
          className="text-[11px] tracking-wider uppercase px-4 py-2 border border-line text-ink-dim hover:text-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}
