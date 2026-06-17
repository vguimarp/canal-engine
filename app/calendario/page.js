"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

const STATUS = ["rascunho", "pronto", "agendado", "publicado", "erro", "cancelado"];
const STATUS_TONE = { rascunho: "", pronto: "ok", agendado: "ok", publicado: "ok", erro: "alert", cancelado: "alert" };

export default function Calendario() {
  const [channelId] = useActiveChannel();
  const [events, setEvents] = useState([]);
  const [platform, setPlatform] = useState("");

  const load = () => {
    const p = platform ? `&platform=${platform}` : "";
    fetch(`/api/calendar?channelId=${channelId}${p}`).then((r) => r.json()).then(setEvents);
  };
  useEffect(() => { load(); }, [channelId, platform]);

  const reschedule = async (id, date) => {
    await fetch("/api/distribution", { method: "PATCH", body: JSON.stringify({ id, scheduled_at: date, status: date ? "agendado" : "rascunho" }) });
    load();
  };
  const setStatus = async (id, status) => {
    await fetch("/api/distribution", { method: "PATCH", body: JSON.stringify({ id, status }) });
    load();
  };

  const platforms = [...new Set(events.map((e) => e.platform))];
  const scheduled = events.filter((e) => e.scheduled_at).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const inWeek = scheduled.filter((e) => {
    const d = new Date(e.scheduled_at);
    return d >= today && d <= weekEnd && e.status !== "cancelado" && e.status !== "publicado";
  });
  const late = scheduled.filter((e) => new Date(e.scheduled_at) < today && !["publicado", "cancelado"].includes(e.status));
  const ready = events.filter((e) => e.status === "pronto" && !e.scheduled_at);
  const upcoming = scheduled.filter((e) => e.status === "agendado").slice(0, 8);

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 06 — AGENDA" title="Calendário Editorial">
          Organize o que publicar, quando e em qual plataforma. Agende, reagende e acompanhe o
          status de cada peça — do rascunho ao publicado.
        </PageHead>
        <Dica>
          Defina uma data em cada item para <strong>agendar</strong>. Os itens com data aparecem em
          <strong> Próximas publicações</strong>. Use os filtros por plataforma para focar.
        </Dica>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card label="Itens no calendário" value={events.length} />
          <Card label="Agendados" value={events.filter((e) => e.status === "agendado").length} />
          <Card label="Publicados" value={events.filter((e) => e.status === "publicado").length} />
          <Card label="Rascunhos" value={events.filter((e) => e.status === "rascunho").length} />
          <Card label="Esta semana" value={inWeek.length} />
          <Card label="Atrasados" value={late.length} />
          <Card label="Prontos" value={ready.length} />
          <Card label="Plataformas" value={platforms.length} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <Panel title="Agenda da semana">
            <EventList rows={inWeek} empty="Nada marcado para os próximos 7 dias." />
          </Panel>
          <Panel title="Conteúdos atrasados">
            <EventList rows={late} empty="Nenhum conteúdo atrasado." />
          </Panel>
          <Panel title="Prontos para publicar">
            <EventList rows={ready} empty="Nenhum conteúdo pronto sem data." />
          </Panel>
        </div>

        <Panel title="Próximas publicações">
          {upcoming.length === 0 ? (
            <div className="text-ink-dim text-sm">Nada agendado ainda. Defina datas abaixo.</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm gap-3">
                  <span className="text-amber shrink-0 w-28">{fmt(e.scheduled_at)}</span>
                  <span className="text-ink truncate flex-1">{e.video_title}</span>
                  <span className="text-ink-dim text-[11px] shrink-0">{e.platform}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="flex flex-wrap gap-2 my-4">
          <button onClick={() => setPlatform("")} className={`text-xs px-3 py-1.5 border uppercase tracking-wide ${platform === "" ? "border-amber text-amber" : "border-line text-ink-dim"}`}>Todas</button>
          {platforms.map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={`text-xs px-3 py-1.5 border uppercase tracking-wide ${platform === p ? "border-amber text-amber" : "border-line text-ink-dim"}`}>{p}</button>
          ))}
        </div>

        <div className="border border-line bg-paper-2 divide-y divide-line">
          {events.map((e) => (
            <div key={e.id} className="p-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-ink text-sm truncate">{e.video_title}</div>
                <div className="text-ink-dim text-[11px]">{e.platform} · {e.format}</div>
              </div>
              <input type="date" value={e.scheduled_at ? e.scheduled_at.slice(0, 10) : ""}
                onChange={(ev) => reschedule(e.id, ev.target.value || null)}
                className="bg-paper border border-line text-ink text-xs px-2 py-1 outline-none focus:border-amber" />
              <select value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)}
                className="bg-paper border border-line text-ink text-xs px-2 py-1 outline-none focus:border-amber">
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Tag tone={STATUS_TONE[e.status]}>{e.status}</Tag>
            </div>
          ))}
        </div>
      </Shell>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="border border-line bg-paper-2 p-4">
      <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">{label}</div>
      <div className="text-2xl text-amber">{value}</div>
    </div>
  );
}
function fmt(d) { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; } }

function EventList({ rows, empty }) {
  if (!rows.length) return <div className="text-ink-dim text-sm">{empty}</div>;
  return (
    <div className="space-y-2">
      {rows.slice(0, 6).map((e) => (
        <div key={e.id} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-ink truncate">{e.video_title}</span>
            <span className="text-amber text-[11px] shrink-0">{e.scheduled_at ? fmt(e.scheduled_at) : e.status}</span>
          </div>
          <div className="text-ink-dim text-[11px]">{e.platform} · {e.status}</div>
        </div>
      ))}
    </div>
  );
}
