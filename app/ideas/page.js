"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag, GenButton, Bar } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

export default function Ideas() {
  const [channelId] = useActiveChannel();
  const [ideas, setIdeas] = useState([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState(null); // id da ideia em ação
  const [note, setNote] = useState("");

  const load = async () => {
    const fmt = filter ? `&format=${filter}` : "";
    setIdeas(await fetch(`/api/ideas?channelId=${channelId}${fmt}`).then((r) => r.json()));
  };
  useEffect(() => { load(); }, [filter, channelId]);

  const generate = async () => {
    setBusy(true);
    await fetch("/api/ideas", { method: "POST", body: JSON.stringify({ channelId, longCount: 5, shortCount: 10 }) });
    await load(); setBusy(false);
  };

  const setStatus = async (id, status) => {
    setActing(id); setNote("");
    await fetch("/api/ideas", { method: "PATCH", body: JSON.stringify({ id, status }) });
    await load(); setActing(null);
  };

  const produce = async (id) => {
    setActing(id); setNote("");
    const r = await fetch("/api/videos", { method: "POST", body: JSON.stringify({ ideaId: id, channelId }) });
    const data = await r.json().catch(() => ({}));
    await load(); setActing(null);
    setNote(r.ok
      ? `✓ Vídeo "${data.title}" criado (+${data.shorts} shorts, +${data.posts} posts). Veja na aba Produção.`
      : `✗ ${data.error || "Falha ao produzir."}`);
  };

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 01 — PAUTA" title="Banco de Ideias">
          Cada ideia carrega um ângulo único e uma nota de originalidade. Ideias com
          originalidade abaixo de 50 são sinalizadas — o sistema desencoraja repetição
          que violaria a política de conteúdo autêntico.
        </PageHead>

        <Dica>
          As ideias do <strong>topo</strong> sao as melhores. A etiqueta <strong>verde</strong> quer dizer
          que a ideia e original; a <strong>vermelha</strong> avisa que ela esta parecida demais com outras —
          evite essas para nao ter problema com as regras do YouTube.
        </Dica>

        <div className="flex items-center gap-2 mb-5">
          {["", "long", "short"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 border tracking-wider uppercase ${
                filter === f ? "border-amber text-amber" : "border-line text-ink-dim hover:text-ink"
              }`}>
              {f === "" ? "Todas" : f === "long" ? "Longos" : "Shorts"}
            </button>
          ))}
          <div className="ml-auto"><GenButton onClick={generate} loading={busy}>Gerar mais</GenButton></div>
        </div>

        {note && <div className="mb-4 text-sm fade-in text-ink">{note}</div>}

        <div className="border border-line bg-paper-2 divide-y divide-line">
          {ideas.slice(0, 40).map((i) => (
            <div key={i.id} className="p-4 hover:bg-paper transition-colors">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag>{i.format === "long" ? "LONGO" : "SHORT"}</Tag>
                    {i.originality < 50
                      ? <Tag tone="alert">orig. {i.originality}</Tag>
                      : <Tag tone="ok">orig. {i.originality}</Tag>}
                    {i.status && i.status !== "idea" && (
                      <Tag tone={i.status === "rejected" ? "alert" : "ok"}>{i.status}</Tag>
                    )}
                  </div>
                  <div className="text-ink text-sm">{i.angle}</div>
                  <div className="text-ink-dim text-[11px] mt-0.5">tema: {i.topic}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-amber text-lg">{i.score}</div>
                  <div className="text-ink-dim text-[10px]">score</div>
                </div>
              </div>
              <Bar value={i.originality} />

              {/* Ações do pipeline (Fase 1) */}
              <div className="flex flex-wrap gap-2 mt-3">
                {i.status === "idea" && (
                  <>
                    <ActBtn onClick={() => setStatus(i.id, "approved")} busy={acting === i.id}>Aprovar</ActBtn>
                    <ActBtn onClick={() => setStatus(i.id, "rejected")} busy={acting === i.id} tone="alert">Rejeitar</ActBtn>
                  </>
                )}
                {i.status === "approved" && i.format === "long" && (
                  <ActBtn onClick={() => produce(i.id)} busy={acting === i.id} tone="amber">Produzir vídeo</ActBtn>
                )}
                {i.status === "approved" && i.format === "short" && (
                  <span className="text-ink-dim text-[11px]">Aprovada — shorts saem como derivados de um vídeo longo.</span>
                )}
                {i.status === "produced" && <span className="text-ok text-[11px]">Já produzida — veja na aba Produção.</span>}
                {i.status === "rejected" && (
                  <ActBtn onClick={() => setStatus(i.id, "idea")} busy={acting === i.id}>Reabrir</ActBtn>
                )}
              </div>
            </div>
          ))}
        </div>
      </Shell>
    </div>
  );
}

// Botão de ação compacto do pipeline de ideias.
function ActBtn({ onClick, busy, children, tone }) {
  const c = tone === "alert" ? "border-alert text-alert hover:bg-alert"
    : tone === "amber" ? "border-amber text-amber hover:bg-amber hover:text-paper"
    : "border-line text-ink-dim hover:text-ink";
  return (
    <button onClick={onClick} disabled={busy}
      className={`text-[11px] tracking-wider uppercase px-3 py-1.5 border transition-colors disabled:opacity-40 ${c}`}>
      {busy ? "…" : children}
    </button>
  );
}
