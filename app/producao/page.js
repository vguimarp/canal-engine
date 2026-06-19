"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Tag } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

export default function Producao() {
  const [channelId] = useActiveChannel();
  const [videos, setVideos] = useState([]);
  const [queue, setQueue] = useState([]);   // ideias aprovadas prontas p/ produzir
  const [open, setOpen] = useState(null);
  const [acting, setActing] = useState(null);
  const [note, setNote] = useState("");
  const [previews, setPreviews] = useState({});

  const load = () => {
    fetch(`/api/videos?channelId=${channelId}`).then((r) => r.json()).then(setVideos);
    fetch(`/api/ideas?channelId=${channelId}&producible=1`).then((r) => r.json()).then(setQueue);
  };
  useEffect(() => { load(); }, [channelId]);

  const produce = async (ideaId) => {
    setActing(ideaId); setNote("");
    const r = await fetch("/api/videos", { method: "POST", body: JSON.stringify({ ideaId, channelId }) });
    const data = await r.json().catch(() => ({}));
    load(); setActing(null);
    setNote(r.ok ? `✓ Vídeo "${data.title}" criado.` : `✗ ${data.error || "Falha."}`);
  };

  const gerarMidia = async (videoId) => {
    setActing(`media-${videoId}`); setNote("");
    const r = await fetch("/api/media-factory", {
      method: "POST",
      body: JSON.stringify({ videoId, channelId }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.preview) setPreviews((p) => ({ ...p, [videoId]: data.preview }));
    load();
    setActing(null);
    setNote(r.ok
      ? `✓ Mídia IA preparada. Arquivo: ${data.preview?.filePath || data.preview?.fileName || "thumbnail salva"}.`
      : `✗ ${data.error || "Falha ao preparar mídia IA."}`);
  };

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 02 — PRODUÇÃO" title="Linha de Produção">
          Pacote completo por vídeo: título, descrição, tags, roteiro-rascunho e thumbnail.
          O roteiro contém marcações [INPUT HUMANO] obrigatórias — o que mantém o conteúdo original.
        </PageHead>

        <Dica>
          Clique em qualquer video para <strong>abrir</strong> e ver o roteiro completo.
          Procure por <strong>[INPUT HUMANO]</strong> no texto: ali voce escreve algo seu
          (uma opiniao, um fato que pesquisou). E o que faz o YouTube aceitar seu video como original.
        </Dica>

        {note && <div className="mb-4 text-sm fade-in text-ink">{note}</div>}

        {queue.length > 0 && (
          <div className="border border-amber-dim bg-paper-2 mb-6">
            <div className="px-4 py-3 border-b border-line text-amber text-[11px] tracking-widest uppercase">
              Fila — ideias aprovadas prontas para produzir
            </div>
            <div className="divide-y divide-line">
              {queue.map((i) => (
                <div key={i.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-ink text-sm truncate">{i.angle}</div>
                    <div className="text-ink-dim text-[11px] mt-0.5">tema: {i.topic} · score {i.score}</div>
                  </div>
                  <button onClick={() => produce(i.id)} disabled={acting === i.id}
                    className="shrink-0 text-[11px] tracking-wider uppercase px-3 py-1.5 border border-amber text-amber hover:bg-amber hover:text-paper transition-colors disabled:opacity-40">
                    {acting === i.id ? "Produzindo…" : "Produzir"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="border border-line bg-paper-2">
              <button onClick={() => setOpen(open === v.id ? null : v.id)}
                className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-paper transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag tone="ok">{v.status}</Tag>
                    {v.overlay_text && <Tag>thumb: {v.overlay_text}</Tag>}
                  </div>
                  <div className="text-ink text-sm truncate">{v.title}</div>
                </div>
                <div className="text-ink-dim text-xs shrink-0">{open === v.id ? "−" : "+"}</div>
              </button>

              {open === v.id && (
                <div className="border-t border-line p-4 space-y-4 text-sm fade-in">
                  <button onClick={() => gerarMidia(v.id)} disabled={acting === `media-${v.id}`}
                    className="text-[11px] tracking-wider uppercase px-3 py-1.5 border border-amber text-amber hover:bg-amber hover:text-paper transition-colors disabled:opacity-40">
                    {acting === `media-${v.id}` ? "Preparando…" : "Gerar mídia IA"}
                  </button>
                  <a href={`/api/export/${v.id}?format=md`}
                    className="ml-2 inline-block text-[11px] tracking-wider uppercase px-3 py-1.5 border border-line text-ink-dim hover:text-ink transition-colors">
                    Exportar pacote
                  </a>
                  {(previews[v.id] || v.media_preview_id) && (
                    <div className="grid md:grid-cols-[320px_1fr] gap-4 items-start">
                      <img src={previews[v.id]?.url || `/api/media/${v.media_preview_id}`} alt={`Thumbnail de ${v.title}`}
                        className="w-full max-w-[320px] aspect-video object-cover border border-line bg-paper" />
                      <div>
                        <div className="text-amber text-[10px] tracking-widest uppercase mb-2">Thumbnail/Capa gerada</div>
                        <p className="text-ink-dim text-[12px] leading-relaxed mb-3">
                          Capa local gerada sem depender de OpenAI, salva como arquivo real e associada a este vídeo.
                        </p>
                        <a href={previews[v.id]?.downloadUrl || `/api/media/${v.media_preview_id}?download=1`}
                          className="inline-block text-[11px] tracking-wider uppercase px-3 py-1.5 border border-amber text-amber hover:bg-amber hover:text-paper transition-colors">
                          Baixar thumbnail
                        </a>
                      </div>
                    </div>
                  )}
                  <Field label="Descrição"><pre className="whitespace-pre-wrap text-ink-dim text-[12px] leading-relaxed">{v.description}</pre></Field>
                  <Field label="Tags">
                    <div className="flex flex-wrap gap-1">
                      {(v.tags || []).map((t, i) => <Tag key={i}>{t}</Tag>)}
                    </div>
                  </Field>
                  <Field label="Roteiro (rascunho)">
                    <pre className="whitespace-pre-wrap text-ink-dim text-[12px] leading-relaxed bg-paper p-3 border border-line max-h-72 overflow-auto">{v.script}</pre>
                  </Field>
                  <Field label="Prompt de thumbnail">
                    <pre className="whitespace-pre-wrap text-ink-dim text-[12px] leading-relaxed">{v.thumb_prompt}</pre>
                  </Field>
                </div>
              )}
            </div>
          ))}
        </div>
      </Shell>
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
