"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead } from "@/components/ui";
import { Dica } from "@/components/help";
import { useActiveChannel } from "@/components/channel";

const LABELS = { "30d": "30 dias", "90d": "90 dias", "180d": "180 dias", "365d": "365 dias" };

export default function Estrategia() {
  const [channelId] = useActiveChannel();
  const [strat, setStrat] = useState([]);
  useEffect(() => { fetch(`/api/strategy?channelId=${channelId}`).then((r) => r.json()).then(setStrat); }, [channelId]);

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ARQUIVO 04 — PLANO" title="Estratégia por Horizonte">
          Metas ancoradas nos limiares reais do YouTube (1.000 inscritos + 4.000h, ou 10M
          views em Shorts). Sem promessa de monetização garantida — foco em crescimento sustentável.
        </PageHead>
        <Dica>
          Este e o seu mapa do caminho. Comece pelos <strong>30 dias</strong> e va descendo.
          Nao tente fazer tudo de uma vez — cada fase prepara a proxima.
        </Dica>
        <div className="relative pl-6">
          <div className="absolute left-0 top-2 bottom-2 w-px bg-line" />
          <div className="space-y-6">
            {strat.map((s) => (
              <div key={s.id} className="relative">
                <div className="absolute -left-6 top-1.5 w-3 h-3 bg-amber rounded-full ring-4 ring-paper" />
                <div className="border border-line bg-paper-2 p-5">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="serif text-2xl text-amber">{LABELS[s.horizon] || s.horizon}</span>
                  </div>
                  <p className="text-ink text-sm mb-4">{s.goal}</p>
                  <ul className="space-y-2">
                    {(s.actions || []).map((a, i) => (
                      <li key={i} className="flex gap-3 text-sm text-ink-dim">
                        <span className="text-amber-dim">—</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    </div>
  );
}
