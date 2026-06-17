"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Stat, Tag, GenButton } from "@/components/ui";

const PLATFORM_LABELS = {
  youtube_shorts: "YouTube Shorts",
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  facebook_reels: "Facebook Reels",
  kwai: "Kwai",
};

const DEFAULT_LIMITS = {
  maxIdeas: 3,
  maxVideos: 2,
  maxShorts: 10,
  maxScheduledPosts: 14,
  platforms: Object.keys(PLATFORM_LABELS),
  calendarDays: 7,
};

export default function ExecucaoPage() {
  const [mode, setMode] = useState("seguro");
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const sp = new URLSearchParams({
      mode,
      maxIdeas: limits.maxIdeas,
      maxVideos: limits.maxVideos,
      maxShorts: limits.maxShorts,
      maxScheduledPosts: limits.maxScheduledPosts,
      calendarDays: limits.calendarDays,
      platforms: limits.platforms.join(","),
    });
    return sp.toString();
  }, [mode, limits]);

  const load = async () => {
    const [p, h] = await Promise.all([
      fetch(`/api/execution/run?${query}`).then((r) => r.json()),
      fetch("/api/execution/history?limit=6").then((r) => r.json()),
    ]);
    setPreview(p);
    setHistory(h);
  };

  useEffect(() => { load(); }, [query]);

  const setLimit = (name, value) => {
    setLimits((l) => ({ ...l, [name]: Number(value) }));
  };

  const togglePlatform = (platform) => {
    setLimits((l) => {
      const exists = l.platforms.includes(platform);
      const platforms = exists ? l.platforms.filter((p) => p !== platform) : [...l.platforms, platform];
      return { ...l, platforms: platforms.length ? platforms : [platform] };
    });
  };

  const execute = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    const response = await fetch("/api/execution/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, limits }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(body.error || "Não foi possível executar a operação.");
      return;
    }
    setResult(body);
    await load();
  };

  const report = result?.report?.report_json;

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="EXECUÇÃO AUTÔNOMA" title="Operação completa">
          Escolha o ritmo da operação, defina limites seguros e deixe o Canal Engine preparar produção,
          distribuição, revisão e calendário com base nos dados atuais.
        </PageHead>

        <div className="grid xl:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-4">
            <Panel title="Foco automático">
              <div className="grid lg:grid-cols-3 gap-3 mb-4">
                <button onClick={() => setMode("seguro")} className={modeClass(mode === "seguro")}>
                  <span className="block text-ink text-sm">Seguro</span>
                  <span className="block text-ink-dim text-[11px] mt-1">Prepara tudo para revisão humana.</span>
                </button>
                <button onClick={() => setMode("crescimento")} className={modeClass(mode === "crescimento")}>
                  <span className="block text-ink text-sm">Crescimento</span>
                  <span className="block text-ink-dim text-[11px] mt-1">Prioriza volume e consistência.</span>
                </button>
                <button onClick={() => setMode("monetizacao")} className={modeClass(mode === "monetizacao")}>
                  <span className="block text-ink text-sm">Monetização</span>
                  <span className="block text-ink-dim text-[11px] mt-1">Prioriza potencial relativo e ranking.</span>
                </button>
                <button onClick={() => setMode("gerar_midia_ia")} className={modeClass(mode === "gerar_midia_ia")}>
                  <span className="block text-ink text-sm">Gerar mídia IA</span>
                  <span className="block text-ink-dim text-[11px] mt-1">Prepara imagens, thumbs, storyboard e cortes.</span>
                </button>
              </div>

              {preview && (
                <div className="grid lg:grid-cols-3 gap-3">
                  <Stat label="Canal recomendado" value={preview.channel?.name || "—"} sub={preview.channel?.niche || "sem canal"} accent />
                  <Stat label="Ideias escolhidas" value={preview.ideas?.length || 0} sub="para produzir primeiro" />
                  <Stat label="Modo" value={preview.modeLabel || "Seguro"} sub="sem promessa de receita" />
                </div>
              )}
            </Panel>

            <Panel title="Limites da operação">
              <div className="grid md:grid-cols-5 gap-3">
                <NumberField label="Ideias" value={limits.maxIdeas} min="1" max="10" onChange={(v) => setLimit("maxIdeas", v)} />
                <NumberField label="Vídeos" value={limits.maxVideos} min="1" max="5" onChange={(v) => setLimit("maxVideos", v)} />
                <NumberField label="Shorts" value={limits.maxShorts} min="0" max="50" onChange={(v) => setLimit("maxShorts", v)} />
                <NumberField label="Agendamentos" value={limits.maxScheduledPosts} min="0" max="60" onChange={(v) => setLimit("maxScheduledPosts", v)} />
                <NumberField label="Dias" value={limits.calendarDays} min="1" max="30" onChange={(v) => setLimit("calendarDays", v)} />
              </div>

              <div className="mt-5">
                <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">Plataformas</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => togglePlatform(key)}
                      className={`px-3 py-2 text-xs border transition-colors ${limits.platforms.includes(key) ? "border-amber text-amber bg-paper" : "border-line text-ink-dim"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Prévia de decisão">
              {preview ? (
                <div className="grid lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">Motivo</div>
                    <p className="text-sm text-ink-dim leading-relaxed">{preview.focus?.reason || preview.summary}</p>
                    <div className="mt-4">
                      <GenButton onClick={execute} loading={busy}>Executar operação completa</GenButton>
                    </div>
                    {error && <div className="text-alert text-sm mt-3">{error}</div>}
                  </div>
                  <div>
                    <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">Produzir primeiro</div>
                    <div className="space-y-2">
                      {(preview.ideas || []).length ? preview.ideas.map((idea) => (
                        <DecisionRow key={idea.ideaId} title={idea.title} score={idea.score?.total} action={idea.score?.priority} />
                      )) : <div className="text-ink-dim text-sm">Nenhuma ideia nova elegível. Gere ou aprove ideias antes da execução.</div>}
                    </div>
                  </div>
                </div>
              ) : <div className="text-ink-dim text-sm">Carregando plano...</div>}
            </Panel>

            {report && (
              <Panel title="Relatório final">
                <div className="grid lg:grid-cols-4 gap-3 mb-4">
                  <Stat label="Ideias aprovadas" value={report.approvedIdeas.length} accent />
                  <Stat label="Vídeos produzidos" value={report.producedVideos.length} />
                  <Stat label="Agendados" value={report.scheduledPosts.length} />
                  <Stat label="Para revisão" value={report.reviewItems.length + report.blockedItems.length} />
                </div>
                <p className="text-sm text-ink mb-4">{report.summary}</p>
                <div className="grid lg:grid-cols-2 gap-4">
                  <SimpleList title="Ações preparadas" rows={report.distributionPackages.map((a) => `${PLATFORM_LABELS[a.platform] || a.platform}: ${a.status}`)} />
                  <SimpleList title="Próximos passos" rows={report.nextActions} />
                </div>
              </Panel>
            )}
          </div>

          <div className="space-y-4">
            <Panel title="Regras ativas">
              <div className="space-y-3 text-sm">
                <Rule tone="ok" title="Seguro" text="Conteúdo seguro pode ir para revisão ou calendário." />
                <Rule tone="amber" title="Revisar" text="Conteúdo em revisão fica na fila antes de publicar." />
                <Rule tone="alert" title="Alto risco" text="Conteúdo de alto risco não é agendado." />
              </div>
            </Panel>

            <Panel title="Histórico">
              <div className="space-y-3">
                {history.length ? history.map((run) => (
                  <div key={run.id} className="border-l-2 border-line pl-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-ink">Operação #{run.id}</span>
                      <Tag tone={run.status === "completed" ? "ok" : run.status === "failed" ? "alert" : undefined}>{run.status}</Tag>
                    </div>
                    <div className="text-ink-dim text-[11px] mt-1">{run.mode} · {run.finished_at || run.started_at}</div>
                    <div className="text-ink-dim text-[11px] mt-1">{run.actions?.length || 0} ação(ões), {run.blocked?.length || 0} revisão(ões)</div>
                  </div>
                )) : <div className="text-ink-dim text-sm">Nenhuma execução registrada ainda.</div>}
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    </div>
  );
}

function modeClass(active) {
  return `text-left border p-4 transition-colors ${active ? "border-amber bg-paper text-amber" : "border-line bg-paper-2 hover:bg-paper"}`;
}

function NumberField({ label, value, onChange, min, max }) {
  return (
    <label className="block">
      <span className="block text-ink-dim text-[10px] tracking-widest uppercase mb-1">{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-paper border border-line text-ink px-3 py-2 text-sm outline-none focus:border-amber" />
    </label>
  );
}

function DecisionRow({ title, score, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
      <span className="text-sm text-ink truncate">{title}</span>
      <span className="text-amber text-sm shrink-0">{score}</span>
      <span className="text-ink-dim text-[10px] uppercase tracking-wide shrink-0">{action}</span>
    </div>
  );
}

function Rule({ tone, title, text }) {
  return (
    <div className="border-l-2 border-line pl-3">
      <Tag tone={tone}>{title}</Tag>
      <div className="text-ink-dim text-[12px] mt-1 leading-relaxed">{text}</div>
    </div>
  );
}

function SimpleList({ title, rows }) {
  return (
    <div>
      <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">{title}</div>
      <div className="space-y-2">
        {rows.length ? rows.map((row, i) => <div key={i} className="text-sm text-ink-dim border-l-2 border-line pl-3">{row}</div>)
          : <div className="text-ink-dim text-sm">Nada pendente.</div>}
      </div>
    </div>
  );
}
