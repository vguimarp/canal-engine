"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { Shell, PageHead, Stat, Panel, Bar, Tag } from "@/components/ui";
import { Dica, BotaoGrande, Passo } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

export default function Home() {
  const [channelId] = useActiveChannel();
  const [data, setData] = useState(null);
  const [learn, setLearn] = useState(null);
  const [execution, setExecution] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [d, m, e] = await Promise.all([
      fetch(`/api/dashboard?channelId=${channelId}`).then((r) => r.json()),
      fetch(`/api/metrics?channelId=${channelId}`).then((r) => r.json()),
      fetch("/api/execution/status").then((r) => r.json()),
    ]);
    setData(d); setLearn(m);
    setExecution(e);
  };
  useEffect(() => { load(); }, [channelId]);

  const fazerTudo = async () => {
    setBusy(true); setMsg("");
    let r = {};
    try {
      const resp = await fetch("/api/run-all", { method: "POST", body: JSON.stringify({ channelId }) });
      r = await resp.json().catch(() => ({}));
      if (!resp.ok || r.error) throw new Error(r.error || "Falha ao gerar conteúdo.");
    } catch (e) {
      setBusy(false);
      setMsg(`⚠ Não consegui gerar agora: ${e.message} Verifique se há um canal selecionado.`);
      return;
    }
    await load();
    setBusy(false);
    // Defensivo: nunca exibe "undefined" — usa 0 quando a chave faltar.
    const t = r.trends ?? 0, i = r.ideas ?? 0, k = r.keywords ?? 0;
    setMsg(`Pronto! Criei ${t} tendências, ${i} ideias e ${k} palavras-chave. Veja nas abas ao lado.`);
  };

  const temConteudo = data && data.counts.ideas > 0;

  // Avisos operacionais derivados dos números do painel.
  const avisos = [];
  if (data) {
    if (data.ideas.total === 0)
      avisos.push({ tone: "amber", text: "⚠ Nenhuma ideia no banco. Clique em \"Fazer tudo agora\" para começar." });
    if (data.ideas.total > 0 && data.ideas.approved === 0 && data.ideas.produced === 0)
      avisos.push({ tone: "amber", text: "⚠ Você tem ideias mas nenhuma aprovada. Vá na aba Ideias e aprove as melhores." });
    if (data.ideas.approved > 0)
      avisos.push({ tone: "amber", text: `▶ ${data.ideas.approved} ideia(s) aprovada(s) aguardando produção na aba Produção.` });
    if (data.ideas.avgOriginality > 0 && data.ideas.avgOriginality < 50)
      avisos.push({ tone: "alert", text: `⚠ Originalidade média baixa (${data.ideas.avgOriginality}). Gere ideias novas e evite temas repetidos.` });
    if (data.content.longVideos > 0 && data.conversionRate < 20)
      avisos.push({ tone: "amber", text: `↘ Conversão ideia→vídeo baixa (${data.conversionRate}%). Aprove e produza mais ideias.` });
  }

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="BEM-VINDO" title="Sua central do canal">
          Aqui voce comanda tudo num lugar so. Nao precisa entender de programacao —
          e so clicar nos botoes. Comece pelo guia abaixo.
        </PageHead>

        <Dica>
          <strong>Primeira vez aqui?</strong> Clique no botao grande <strong>&quot;Fazer tudo agora&quot;</strong>.
          Ele pesquisa temas em alta, cria ideias de videos e monta as palavras-chave automaticamente.
          Depois e so passear pelas abas a esquerda para ver o que foi criado.
        </Dica>

        <Panel title="Como usar — passo a passo">
          <div className="mb-5">
            <BotaoGrande onClick={fazerTudo} loading={busy} sub="Pesquisa temas, cria ideias e palavras-chave de uma vez">
              Fazer tudo agora
            </BotaoGrande>
            {msg && <div className="mt-3 text-ok text-sm fade-in">✓ {msg}</div>}
          </div>
          <div className="border-t border-line pt-5">
            <Passo n="1" titulo="Gere o conteudo" feito={temConteudo}>
              O botao acima faz isso. Ele preenche o sistema com temas, ideias e SEO.
            </Passo>
            <Passo n="2" titulo="Escolha as melhores ideias" feito={false}>
              Va na aba <strong>Ideias</strong>. As de cima sao as mais promissoras. Evite as marcadas
              em vermelho (sao parecidas demais entre si — o YouTube nao gosta disso).
            </Passo>
            <Passo n="3" titulo="Pegue o roteiro pronto" feito={false}>
              Na aba <strong>Producao</strong>, cada video ja vem com titulo, descricao e roteiro.
              Onde estiver escrito <strong>[INPUT HUMANO]</strong>, coloque algo seu — e o que torna o video original.
            </Passo>
            <Passo n="4" titulo="Acompanhe e melhore" feito={false}>
              Conforme voce publica e registra resultados, o sistema aprende quais temas funcionam
              e mostra aqui embaixo em &quot;O que esta funcionando&quot;.
            </Passo>
          </div>
        </Panel>

        {data && (
          <>
            {data.analytics?.focus && (
              <Panel title="Foco da semana">
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1">
                    <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">Canal recomendado</div>
                    <div className="serif text-2xl text-amber leading-tight">{data.analytics.focus.channel?.name || "Sem dados suficientes"}</div>
                    <div className="text-ink-dim text-[12px] mt-1">{data.analytics.focus.channel?.niche}</div>
                    <p className="text-ink-dim text-[12px] leading-relaxed mt-4">{data.analytics.focus.reason}</p>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <SmallMetric label="Nicho" value={data.analytics.focus.niche?.niche || "—"} />
                      <SmallMetric label="Formato" value={data.analytics.focus.format?.format || "—"} />
                    </div>
                  </div>

                  <div>
                    <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">Plano prático</div>
                    <ul className="space-y-2">
                      {data.analytics.focus.plan.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink-dim">
                          <span className="text-amber shrink-0">{i + 1}.</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">Produzir primeiro</div>
                    {data.analytics.focus.produceFirst.length ? (
                      <div className="space-y-2">
                        {data.analytics.focus.produceFirst.map((c) => (
                          <DecisionLine key={c.ideaId} title={c.title} score={c.score.total} action={c.score.priority} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-ink-dim text-sm">Aprove ideias antes de produzir.</div>
                    )}
                  </div>
                </div>
              </Panel>
            )}

            <Panel title="Foco automático" action={<Link href="/execucao" className="text-[11px] tracking-wider uppercase text-amber hover:text-ink">Abrir execução</Link>}>
              <div className="grid lg:grid-cols-4 gap-3">
                <Stat label="Modo recomendado" value="Seguro" sub="comece revisando antes de agendar" accent />
                <Stat label="Canal prioritário" value={data.analytics?.focus?.channel?.name || "—"} sub={data.analytics?.focus?.channel?.niche || "sem dados"} />
                <Stat label="Produzir primeiro" value={data.analytics?.focus?.produceFirst?.length || 0} sub="ideias com maior prioridade" />
                <div className="border border-line bg-paper-2 p-4">
                  <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">Última operação</div>
                  {execution?.id ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl text-ink">#{execution.id}</span>
                        <Tag tone={execution.status === "completed" ? "ok" : execution.status === "failed" ? "alert" : undefined}>{execution.status}</Tag>
                      </div>
                      <div className="text-ink-dim text-[11px] mt-1">{execution.actions?.length || 0} ação(ões), {execution.blocked?.length || 0} revisão(ões)</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl text-ink">Pronta</div>
                      <div className="text-ink-dim text-[11px] mt-1">nenhuma execução registrada</div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 text-sm text-ink-dim leading-relaxed">
                A execução completa aprova ideias, produz conteúdo, gera pacotes de distribuição e prepara calendário respeitando compliance. Alto risco não é agendado.
              </div>
            </Panel>

            <Panel title="Media Factory">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Imagens IA" value={data.mediaFactory?.imagePrompts || 0} sub="prompts originais" accent />
                <Stat label="Thumbnails IA" value={data.mediaFactory?.thumbnails || 0} sub="variações salvas" />
                <Stat label="Vídeos preparados" value={data.mediaFactory?.videoPackages || 0} sub="prontos para renderização futura" />
                <Stat label="Shorts preparados" value={data.mediaFactory?.shortPackages || 0} sub="cortes multiplataforma" />
                <Stat label="Storyboards" value={data.mediaFactory?.storyboards || 0} />
                <Stat label="Cenas" value={data.mediaFactory?.scenes || 0} />
                <Stat label="Aguardando render" value={data.mediaFactory?.waitingRender || 0} />
                <Stat label="Para revisar" value={data.mediaFactory?.review || 0} />
              </div>
              <div className="mt-4 text-sm text-ink-dim leading-relaxed">
                A fábrica prepara imagens, thumbnails, storyboards, cenas e cortes originais para IA. Nenhum vídeo de terceiro é baixado ou reutilizado.
              </div>
            </Panel>

            <h3 className="text-ink-dim text-[11px] tracking-widest uppercase mt-8 mb-3">Painel executivo</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <Stat label="Ideias no banco" value={data.ideas.total} accent />
              <Stat label="Aprovadas" value={data.ideas.approved} />
              <Stat label="Produzidas" value={data.ideas.produced} />
              <Stat label="Rejeitadas" value={data.ideas.rejected} />
              <Stat label="Vídeos longos" value={data.content.longVideos} accent />
              <Stat label="Shorts" value={data.content.shorts} />
              <Stat label="Posts sociais" value={data.content.posts} />
              <Stat label="Conversão ideia→vídeo" value={`${data.conversionRate}%`} sub="ideias longas produzidas" />
              <Stat label="Score médio" value={data.ideas.avgScore} />
              <Stat label="Originalidade média" value={data.ideas.avgOriginality} sub="0–100" />
              <Stat label="Palavras-chave" value={data.counts.keywords} />
              <Stat label="Vídeos prontos" value={data.counts.videosPublished} />
            </div>

            {data.analytics && (
              <>
                <h3 className="text-ink-dim text-[11px] tracking-widest uppercase mt-8 mb-3">Analytics & Monetization Engine</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <Stat label="Melhor canal" value={data.analytics.bestChannel?.name || "—"} sub={data.analytics.bestChannel ? `score ${data.analytics.bestChannel.score.total}` : ""} accent />
                  <Stat label="Melhor nicho" value={data.analytics.bestNiche?.niche || "—"} sub={data.analytics.bestNiche ? `potencial ${data.analytics.bestNiche.score.potential}` : ""} />
                  <Stat label="Melhor formato" value={data.analytics.bestFormat?.format || "—"} sub={data.analytics.bestFormat ? `score ${data.analytics.bestFormat.score}` : ""} />
                  <Stat label="Melhor conteúdo" value={data.analytics.bestContent?.score.total ?? "—"} sub={data.analytics.bestContent?.title || "sem conteúdo"} />
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mb-4">
                  <Panel title="Ranking de canais">
                    <RankList
                      rows={(data.analytics.channelRanking || []).slice(0, 5)}
                      label={(r) => r.name}
                      sub={(r) => r.niche}
                      value={(r) => r.score.total}
                    />
                  </Panel>
                  <Panel title="Ranking de nichos">
                    <RankList
                      rows={(data.analytics.nicheRanking || []).slice(0, 5)}
                      label={(r) => r.niche}
                      sub={(r) => `monetização relativa ${r.score.monetization}`}
                      value={(r) => r.score.total}
                    />
                  </Panel>
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mb-4">
                  <Panel title="Ranking de prioridade">
                    <DecisionList rows={(data.analytics.priorityRankings?.ideas || []).slice(0, 5)} />
                  </Panel>
                  <Panel title="Oportunidades detectadas">
                    <DecisionList rows={(data.analytics.priorityRankings?.opportunities || []).slice(0, 5)} />
                  </Panel>
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mb-4">
                  <Panel title="Riscos de conteúdo">
                    {data.analytics.focus?.risks?.length ? (
                      <div className="space-y-2">
                        {data.analytics.focus.risks.map((r) => (
                          <div key={r.videoId} className="border-l-2 border-line pl-3">
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="text-ink truncate">{r.title}</span>
                              <span className={`shrink-0 text-[11px] ${r.level === "alto risco" ? "text-alert" : r.level === "revisar" ? "text-amber" : "text-ok"}`}>{r.level}</span>
                            </div>
                            <div className="text-ink-dim text-[11px] mt-0.5">{r.reason}</div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-ink-dim text-sm">Seguro: sem sinais críticos.</div>}
                  </Panel>
                  <Panel title="Aguardando publicação">
                    {data.analytics.focus?.reuse?.length ? (
                      <div className="space-y-2">
                        {data.analytics.focus.reuse.map((r) => (
                          <DecisionLine key={r.id} title={`${r.title} · ${r.platform}`} score={r.status} action={r.action} />
                        ))}
                      </div>
                    ) : <div className="text-ink-dim text-sm">Nenhum pacote pendente. Gere distribuição na aba Produção ou Distribuição.</div>}
                  </Panel>
                </div>
              </>
            )}

            {/* Avisos operacionais */}
            {avisos.length > 0 && (
              <div className="space-y-2 mb-6">
                {avisos.map((a, i) => (
                  <div key={i} className={`border-l-2 pl-3 py-1 text-[13px] ${a.tone === "alert" ? "border-alert text-alert" : "border-amber-dim text-ink"}`}>
                    {a.text}
                  </div>
                ))}
              </div>
            )}

            {/* Funil: ideias → aprovadas → produzidas */}
            <Panel title="Funil de produção">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Ideias", value: data.funnel.ideas },
                  { label: "Aprovadas", value: data.funnel.approved },
                  { label: "Produzidas", value: data.funnel.produced },
                ].map((f, i) => {
                  const pct = data.funnel.ideas > 0 ? Math.round((f.value / data.funnel.ideas) * 100) : 0;
                  return (
                    <div key={f.label} className="border border-line bg-paper p-3">
                      <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-1">{i + 1}. {f.label}</div>
                      <div className="text-amber text-2xl mb-2">{f.value}</div>
                      <Bar value={pct} />
                      <div className="text-ink-dim text-[10px] mt-1">{pct}% do topo</div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <div className="grid lg:grid-cols-2 gap-4 my-4">
              <Panel title="Top 5 ideias por score">
                {data.topIdeas?.length ? (
                  <div className="space-y-3">
                    {data.topIdeas.map((i) => (
                      <div key={i.id}>
                        <div className="flex justify-between text-sm mb-1 gap-3">
                          <span className="text-ink truncate">{i.angle}</span>
                          <span className="text-amber shrink-0">{i.score}</span>
                        </div>
                        <Bar value={i.score} max={data.topIdeas[0]?.score || 1} />
                      </div>
                    ))}
                  </div>
                ) : <div className="text-ink-dim text-sm">Sem ideias ainda. Clique em &quot;Fazer tudo agora&quot;.</div>}
              </Panel>

              <Panel title="Últimos vídeos produzidos">
                {data.recentVideos?.length ? (
                  <div className="space-y-2">
                    {data.recentVideos.map((v) => (
                      <div key={v.id} className="flex justify-between items-center text-sm gap-3">
                        <span className="text-ink truncate">{v.title}</span>
                        <span className="text-ink-dim text-[10px] uppercase tracking-wider shrink-0">{v.status}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-ink-dim text-sm">Nenhum vídeo produzido. Aprove uma ideia e produza na aba Produção.</div>}
              </Panel>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mb-4">
              <Panel title="Videos com mais visualizacoes">
                <p className="text-ink-dim text-[11px] mb-3">Numeros de exemplo ate voce conectar sua conta do YouTube.</p>
                <div className="space-y-3">
                  {data.topVideos.map((v) => (
                    <div key={v.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-ink truncate pr-3">{v.title}</span>
                        <span className="text-ink-dim shrink-0">{Number(v.views).toLocaleString("pt-BR")}</span>
                      </div>
                      <Bar value={v.views} max={data.topVideos[0]?.views || 1} />
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="O que esta funcionando">
                <p className="text-ink-dim text-[11px] mb-3">O sistema aprende sozinho com o tempo.</p>
                {learn?.learnings?.length ? (
                  <div className="space-y-3">
                    {learn.learnings.map((l, i) => (
                      <div key={i} className="border-l-2 border-amber-dim pl-3">
                        <div className="text-sm text-ink">{l.pattern}</div>
                        <div className="text-ink-dim text-[11px] mt-0.5">{l.evidence}</div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-ink-dim text-sm">Ainda aprendendo. Registre resultados dos videos.</div>}
              </Panel>
            </div>
          </>
        )}
      </Shell>
    </div>
  );
}

function RankList({ rows = [], label, sub, value }) {
  const max = Math.max(1, ...rows.map((r) => Number(value(r) || 0)));
  if (!rows.length) return <div className="text-ink-dim text-sm">Sem dados suficientes ainda.</div>;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const v = Number(value(r) || 0);
        return (
          <div key={r.id || r.niche || r.ideaId || i}>
            <div className="flex justify-between text-sm mb-1 gap-3">
              <span className="text-ink truncate">
                <span className="text-ink-dim mr-2">{i + 1}º</span>{label(r)}
              </span>
              <span className="text-amber shrink-0">{v}</span>
            </div>
            <Bar value={v} max={max} />
            {sub && <div className="text-ink-dim text-[10px] mt-1 truncate">{sub(r)}</div>}
          </div>
        );
      })}
    </div>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="border border-line bg-paper p-3">
      <div className="text-ink-dim text-[9px] tracking-widest uppercase mb-1">{label}</div>
      <div className="text-ink text-sm truncate">{value}</div>
    </div>
  );
}

function DecisionList({ rows = [] }) {
  if (!rows.length) return <div className="text-ink-dim text-sm">Sem dados suficientes ainda.</div>;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={`${r.type}-${r.id || r.title}-${i}`} className="border-l-2 border-amber-dim pl-3">
          <DecisionLine title={r.title} score={r.score} action={r.action} />
          <div className="text-ink-dim text-[11px] mt-0.5">{r.reason}</div>
        </div>
      ))}
    </div>
  );
}

function DecisionLine({ title, score, action }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-ink truncate">{title}</span>
      <span className="text-amber shrink-0">{score}</span>
      <span className="text-ink-dim text-[10px] uppercase tracking-wide shrink-0">{action}</span>
    </div>
  );
}
