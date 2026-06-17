"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

const TABS = [
  { key: "videos", label: "Vídeos" },
  { key: "shorts", label: "Shorts" },
  { key: "posts", label: "Posts" },
  { key: "thumbs", label: "Thumbnails" },
  { key: "media", label: "Media Factory" },
  { key: "library", label: "Acervo" },
  { key: "templates", label: "Templates" },
  { key: "queues", label: "Filas" },
  { key: "logs", label: "Logs" },
];

export default function Biblioteca() {
  const [channelId] = useActiveChannel();
  const [tab, setTab] = useState("videos");
  const [library, setLibrary] = useState([]);
  const [overview, setOverview] = useState({ videos: [], shorts: [], posts: [], thumbnails: [] });
  const [templates, setTemplates] = useState([]);
  const [queues, setQueues] = useState({ summary: [], items: [] });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch(`/api/library?channelId=${channelId}`).then((r) => r.json()).then(setLibrary);
    fetch(`/api/library?channelId=${channelId}&view=overview`).then((r) => r.json()).then(setOverview);
    fetch(`/api/queues?channelId=${channelId}`).then((r) => r.json()).then(setQueues);
    fetch(`/api/logs?channelId=${channelId}`).then((r) => r.json()).then(setLogs);
    fetch(`/api/templates`).then((r) => r.json()).then(setTemplates);
  }, [channelId]);

  const copy = (text) => navigator.clipboard?.writeText(text);

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 07 — ACERVO" title="Biblioteca de Conteúdo">
          Tudo que você já gerou fica guardado e reutilizável: roteiros, descrições, hashtags,
          prompts e títulos. Inclui também os templates por plataforma, as filas e o histórico.
        </PageHead>
        <Dica>Clique em <strong>copiar</strong> para reaproveitar qualquer trecho em um novo vídeo ou post.</Dica>

        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1.5 border uppercase tracking-wide ${tab === t.key ? "border-amber text-amber" : "border-line text-ink-dim hover:text-ink"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "videos" && <SimpleList empty="Nenhum vídeo longo neste canal." rows={overview.videos || []}
          render={(v) => <Row key={v.id} tag={v.status} title={v.title} meta={fmt(v.created_at)} />} />}

        {tab === "shorts" && <SimpleList empty="Nenhum short neste canal." rows={overview.shorts || []}
          render={(v) => <Row key={v.id} tag={v.status} title={v.title} meta={v.parent_id ? `derivado do vídeo #${v.parent_id}` : fmt(v.created_at)} />} />}

        {tab === "posts" && <SimpleList empty="Nenhum post social neste canal." rows={overview.posts || []}
          render={(p) => <Row key={p.id} tag={p.platform} title={p.video_title} meta={p.content} action={() => copy(p.content)} />} />}

        {tab === "thumbs" && <SimpleList empty="Nenhuma variação de thumbnail neste canal." rows={overview.thumbnails || []}
          render={(t) => <Row key={t.id} tag={t.recommended ? "recomendada" : `v${t.variant}`} title={t.video_title} meta={`${t.main_text} · CTR estimado ${t.ctr_estimate}`} action={() => copy(t.prompt)} />} />}

        {tab === "media" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="Imagens" value={overview.mediaFactory?.summary?.imagePrompts || 0} />
              <MiniStat label="Thumbs IA" value={overview.mediaFactory?.summary?.thumbnails || 0} />
              <MiniStat label="Vídeos preparados" value={overview.mediaFactory?.summary?.videoPackages || 0} />
              <MiniStat label="Aguardando render" value={overview.mediaFactory?.summary?.waitingRender || 0} />
            </div>
            <SimpleList empty="Nenhuma mídia IA preparada neste canal." rows={overview.mediaFactory?.assets || []}
              render={(it) => (
                <Row key={it.id}
                  tag={labelMedia(it.asset_type)}
                  title={it.video_title || it.title}
                  meta={`${it.title || ""} · ${it.platform || "Canal Engine"} · ${it.risk_level}`}
                  action={() => copy(it.prompt || JSON.stringify(it.metadata || {}, null, 2))}
                />
              )} />
          </div>
        )}

        {tab === "library" && (
          <div className="border border-line bg-paper-2 divide-y divide-line">
            {library.length === 0 ? <div className="p-4 text-ink-dim text-sm">Biblioteca vazia. Produza vídeos para preencher.</div> :
              library.map((it) => (
                <div key={it.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2"><Tag>{it.type}</Tag><span className="text-ink text-sm truncate">{it.title}</span></div>
                    <button onClick={() => copy(it.content)} className="text-[10px] uppercase tracking-wide text-amber hover:underline shrink-0">copiar</button>
                  </div>
                  <pre className="whitespace-pre-wrap text-ink-dim text-[12px] line-clamp-3 max-h-20 overflow-hidden">{it.content}</pre>
                </div>
              ))}
          </div>
        )}

        {tab === "templates" && (
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((p) => (
              <Panel key={p.key} title={`${p.label} · ${p.ratio}`}>
                <div className="text-[12px] space-y-2">
                  <div><span className="text-amber text-[10px] uppercase tracking-widest">CTA</span><div className="text-ink-dim">{p.template?.cta}</div></div>
                  <div><span className="text-amber text-[10px] uppercase tracking-widest">Hashtags</span>
                    <div className="flex flex-wrap gap-1 mt-1">{(p.template?.hashtags || []).map((h, i) => <Tag key={i}>{h}</Tag>)}</div></div>
                  <div><span className="text-amber text-[10px] uppercase tracking-widest">Checklist</span>
                    <ul className="text-ink-dim mt-1">{(p.template?.checklist || []).map((c, i) => <li key={i}>☐ {c}</li>)}</ul></div>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {tab === "queues" && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {queues.summary.map((q) => (
                <div key={q.type} className="border border-line bg-paper-2 p-4">
                  <div className="text-ink-dim text-[10px] uppercase tracking-widest mb-2">{q.type}</div>
                  <div className="text-ink text-sm">{q.concluido}/{q.total} <span className="text-ink-dim text-[11px]">processados</span></div>
                  {q.pendente > 0 && <div className="text-amber text-[11px] mt-1">{q.pendente} pendentes</div>}
                </div>
              ))}
            </div>
            <p className="text-ink-dim text-[11px]">As filas estão preparadas para processamento automático futuro (sem worker em execução agora).</p>
          </div>
        )}

        {tab === "logs" && (
          <div className="border border-line bg-paper-2 divide-y divide-line">
            {logs.length === 0 ? <div className="p-4 text-ink-dim text-sm">Sem registros ainda.</div> :
              logs.map((l) => (
                <div key={l.id} className="px-4 py-2 flex items-center gap-3 text-[12px]">
                  <Tag>{l.action}</Tag>
                  <span className="text-ink truncate flex-1">{l.entity}</span>
                  {l.status_from && <span className="text-ink-dim">{l.status_from} → {l.status_to}</span>}
                  <span className="text-ink-dim shrink-0">{fmt(l.created_at)}</span>
                </div>
              ))}
          </div>
        )}
      </Shell>
    </div>
  );
}
function fmt(d) { try { return new Date(d.replace(" ", "T") + "Z").toLocaleString("pt-BR"); } catch { return d; } }

function SimpleList({ rows, render, empty }) {
  return (
    <div className="border border-line bg-paper-2 divide-y divide-line">
      {rows.length ? rows.map(render) : <div className="p-4 text-ink-dim text-sm">{empty}</div>}
    </div>
  );
}

function Row({ tag, title, meta, action }) {
  return (
    <div className="p-4 flex items-start gap-3">
      <Tag>{tag}</Tag>
      <div className="min-w-0 flex-1">
        <div className="text-ink text-sm truncate">{title}</div>
        <div className="text-ink-dim text-[12px] line-clamp-2">{meta}</div>
      </div>
      {action && <button onClick={action} className="text-[10px] uppercase tracking-wide text-amber hover:underline shrink-0">copiar</button>}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="border border-line bg-paper-2 p-4">
      <div className="text-ink-dim text-[10px] uppercase tracking-widest mb-2">{label}</div>
      <div className="text-amber text-2xl">{value}</div>
    </div>
  );
}

function labelMedia(type) {
  return {
    image_prompt: "imagem",
    thumbnail: "thumb",
    storyboard: "storyboard",
    scene: "cena",
    video_package: "vídeo IA",
    short_package: "short",
    distribution_package: "distribuição",
  }[type] || type;
}
