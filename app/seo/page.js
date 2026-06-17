"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, GenButton, Tag, Bar, Panel } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

const INTENT_LABEL = {
  informational: "Informacional", curiosity: "Curiosidade",
  howto: "Como fazer", news: "Notícia", commercial: "Comercial",
};

export default function Seo() {
  const [channelId] = useActiveChannel();
  const [kw, setKw] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const loadPool = async () => setKw(await fetch(`/api/seo?channelId=${channelId}`).then((r) => r.json()));
  const loadVideos = async () => setVideos(await fetch(`/api/videos?channelId=${channelId}`).then((r) => r.json()));
  useEffect(() => { setSelected(null); setPkg(null); loadPool(); loadVideos(); }, [channelId]);

  const openVideo = async (id) => {
    setSelected(id); setPkg(null); setNote("");
    const r = await fetch("/api/seo?videoId=" + id);
    if (r.ok) { setPkg(await r.json()); }
    else { setNote("Este vídeo ainda não tem pacote SEO."); }
  };

  const generateForVideo = async (id) => {
    setBusy(true); setNote("");
    const r = await fetch("/api/seo/generate", { method: "POST", body: JSON.stringify({ videoId: id }) });
    setBusy(false);
    if (r.ok) await openVideo(id);
    else setNote("Falha ao gerar pacote SEO.");
  };

  const genPool = async () => { setBusy(true); await fetch("/api/seo", { method: "POST", body: JSON.stringify({ channelId }) }); await loadPool(); setBusy(false); };

  const trendIcon = (t) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
  const trendTone = (t) => t === "up" ? "text-ok" : t === "down" ? "text-alert" : "text-ink-dim";

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 03 — DESCOBERTA" title="Inteligência de SEO">
          Pacote de SEO por vídeo: título otimizado, alternativos, descrição, tags, hashtags e
          palavras-chave com intenção, dificuldade e potencial. Cálculo 100% local (heurístico).
        </PageHead>
        <Dica>
          Escolha um vídeo abaixo para ver o <strong>pacote de SEO completo</strong>. Copie o título,
          a descrição e as tags para o YouTube. As keywords do topo (alto potencial, baixa dificuldade)
          são as mais valiosas. Mais abaixo fica o banco geral de palavras-chave do canal.
        </Dica>

        {/* Seletor de vídeos produzidos */}
        <Panel title="Pacote de SEO por vídeo">
          {videos.length === 0 ? (
            <div className="text-ink-dim text-sm">Nenhum vídeo produzido ainda. Produza um na aba Produção.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {videos.map((v) => (
                <button key={v.id} onClick={() => openVideo(v.id)}
                  className={`text-xs px-3 py-1.5 border tracking-wide max-w-[260px] truncate ${
                    selected === v.id ? "border-amber text-amber" : "border-line text-ink-dim hover:text-ink"
                  }`} title={v.title}>
                  {v.title}
                </button>
              ))}
            </div>
          )}
          {note && <div className="mt-3 text-sm text-ink-dim">{note}
            {selected && <button onClick={() => generateForVideo(selected)} disabled={busy}
              className="ml-2 text-amber underline disabled:opacity-40">{busy ? "gerando…" : "gerar agora"}</button>}
          </div>}
        </Panel>

        {pkg?.package && <SeoPackage data={pkg} intentLabel={INTENT_LABEL} />}

        {/* Pool de keywords do canal */}
        <div className="flex items-center justify-between mt-8 mb-3">
          <h3 className="text-ink-dim text-[11px] tracking-widest uppercase">Banco de palavras-chave do canal</h3>
          <GenButton onClick={genPool} loading={busy}>Gerar keywords</GenButton>
        </div>
        <div className="border border-line bg-paper-2">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-line text-[10px] tracking-widest uppercase text-ink-dim">
            <div className="col-span-5">Palavra-chave</div>
            <div className="col-span-2">Intenção</div>
            <div className="col-span-1 text-center">Tend.</div>
            <div className="col-span-2 text-right">Dificuldade</div>
            <div className="col-span-2 text-right">Oportunidade</div>
          </div>
          <div className="divide-y divide-line">
            {kw.slice(0, 30).map((k) => (
              <div key={k.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-sm hover:bg-paper">
                <div className="col-span-5 text-ink truncate">{k.keyword}</div>
                <div className="col-span-2 text-ink-dim text-[11px]">{INTENT_LABEL[k.intent] || "—"}</div>
                <div className={"col-span-1 text-center " + trendTone(k.trend)}>{trendIcon(k.trend)}</div>
                <div className="col-span-2 text-right text-ink-dim">{k.difficulty ?? "—"}</div>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="flex-1"><Bar value={k.opportunity} /></div>
                  <span className="text-amber text-xs w-8 text-right">{k.opportunity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    </div>
  );
}

function SeoPackage({ data, intentLabel }) {
  const p = data.package;
  return (
    <div className="border border-amber-dim bg-paper-2 mt-4 fade-in">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
        <span className="text-amber text-[11px] tracking-widest uppercase">Pacote SEO</span>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-ink-dim">Dificuldade <span className="text-ink">{p.difficulty}</span></span>
          <span className="text-ink-dim">Potencial <span className="text-ink">{p.potential}</span></span>
          <span className="text-ink-dim">Score SEO <span className="text-amber text-base">{p.seo_score}</span></span>
        </div>
      </div>
      <div className="p-4 space-y-5 text-sm">
        <Field label="Título principal otimizado"><div className="text-ink">{p.main_title}</div></Field>

        <Field label="5 títulos alternativos">
          <ul className="space-y-1">
            {(p.alt_titles || []).map((t, i) => <li key={i} className="text-ink-dim">• {t}</li>)}
          </ul>
        </Field>

        <Field label="Descrição otimizada">
          <pre className="whitespace-pre-wrap text-ink-dim text-[12px] leading-relaxed bg-paper p-3 border border-line max-h-60 overflow-auto">{p.description}</pre>
        </Field>

        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Tags">
            <div className="flex flex-wrap gap-1">{(p.tags || []).map((t, i) => <Tag key={i}>{t}</Tag>)}</div>
          </Field>
          <Field label="Hashtags">
            <div className="flex flex-wrap gap-1">{(p.hashtags || []).map((t, i) => <Tag key={i} tone="ok">{t}</Tag>)}</div>
          </Field>
        </div>

        <Field label="Palavras-chave principais (por potencial × dificuldade)">
          <div className="border border-line">
            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 border-b border-line text-[10px] tracking-widest uppercase text-ink-dim">
              <div className="col-span-5">Keyword</div>
              <div className="col-span-3">Intenção</div>
              <div className="col-span-2 text-right">Dific.</div>
              <div className="col-span-2 text-right">Potenc.</div>
            </div>
            {(data.keywords || p.keywords || []).map((k, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[12px] border-b border-line last:border-0">
                <div className="col-span-5 text-ink truncate">{k.keyword}</div>
                <div className="col-span-3 text-ink-dim">{intentLabel[k.intent] || k.intent}</div>
                <div className="col-span-2 text-right text-ink-dim">{k.difficulty}</div>
                <div className="col-span-2 text-right text-amber">{k.potential}</div>
              </div>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-amber text-[10px] tracking-widest uppercase mb-2">{label}</div>
      {children}
    </div>
  );
}
