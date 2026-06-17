"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag, GenButton } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

const STATUS_TONE = { rascunho: "", pronto: "ok", agendado: "ok", publicado: "ok", erro: "alert", cancelado: "alert" };

export default function Distribuicao() {
  const [channelId] = useActiveChannel();
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadVideos = () => fetch(`/api/videos?channelId=${channelId}`).then((r) => r.json()).then(setVideos);
  useEffect(() => { setSelected(null); setItems([]); loadVideos(); }, [channelId]);

  const open = async (id) => {
    setSelected(id);
    setItems(await fetch(`/api/distribution?videoId=${id}`).then((r) => r.json()));
  };

  const generate = async (id) => {
    setBusy(true);
    await fetch("/api/distribution", { method: "POST", body: JSON.stringify({ videoId: id }) });
    await open(id); setBusy(false);
  };

  const setStatus = async (itemId, status) => {
    await fetch("/api/distribution", { method: "PATCH", body: JSON.stringify({ id: itemId, status }) });
    if (selected) open(selected);
  };

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 05 — ALCANCE" title="Central Multiplataforma">
          Produza uma vez e adapte para YouTube, Shorts, TikTok, Reels, Facebook e Kwai.
          Cada plataforma recebe título, legenda, hashtags, CTA, checklist e formato próprios.
        </PageHead>
        <Dica>
          Escolha um vídeo e clique em <strong>Gerar distribuição</strong>. Depois é só copiar o
          pacote de cada rede e marcar como <strong>pronto</strong> ou <strong>agendado</strong>.
        </Dica>

        <Panel title="Escolha o vídeo">
          {videos.length === 0 ? (
            <div className="text-ink-dim text-sm">Nenhum vídeo neste canal. Produza um na aba Produção.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {videos.map((v) => (
                <button key={v.id} onClick={() => open(v.id)}
                  className={`text-xs px-3 py-1.5 border tracking-wide max-w-[260px] truncate ${
                    selected === v.id ? "border-amber text-amber" : "border-line text-ink-dim hover:text-ink"
                  }`} title={v.title}>{v.title}</button>
              ))}
            </div>
          )}
        </Panel>

        {selected && (
          <div className="flex justify-end my-4">
            <GenButton onClick={() => generate(selected)} loading={busy}>
              {items.length ? "Regerar distribuição" : "Gerar distribuição"}
            </GenButton>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.id} className="border border-line bg-paper-2 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="serif text-lg text-ink">{it.platform_label || it.platform}</span>
                <Tag tone={STATUS_TONE[it.status]}>{it.status}</Tag>
              </div>
              <div className="text-ink-dim text-[10px] uppercase tracking-wide mb-3">{it.format}</div>

              <Mini label="Título">{it.title}</Mini>
              <Mini label="Legenda"><pre className="whitespace-pre-wrap text-[12px] text-ink-dim">{it.caption}</pre></Mini>
              <Mini label="Hashtags"><div className="flex flex-wrap gap-1">{(it.hashtags || []).map((h, i) => <Tag key={i}>{h}</Tag>)}</div></Mini>
              <Mini label="CTA">{it.cta}</Mini>
              <Mini label="Checklist">
                <ul className="text-[12px] text-ink-dim space-y-0.5">{(it.checklist || []).map((c, i) => <li key={i}>☐ {c}</li>)}</ul>
              </Mini>

              <div className="flex flex-wrap gap-2 mt-3">
                {["pronto", "agendado", "publicado", "cancelado"].map((s) => (
                  <button key={s} onClick={() => setStatus(it.id, s)}
                    className="text-[10px] uppercase tracking-wide px-2 py-1 border border-line text-ink-dim hover:text-amber hover:border-amber-dim">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Shell>
    </div>
  );
}

function Mini({ label, children }) {
  return (
    <div className="mb-2">
      <div className="text-amber text-[9px] tracking-widest uppercase mb-1">{label}</div>
      <div className="text-ink text-sm">{children}</div>
    </div>
  );
}
