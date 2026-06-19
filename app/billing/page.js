"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Stat, Bar, Tag } from "@/components/ui";

export default function BillingPage() {
  const [billing, setBilling] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/billing/status").then((r) => r.json()).then(setBilling);
    fetch("/api/monitoring/health").then((r) => r.json()).then(setHealth);
  }, []);

  const usage = billing?.usage || {};
  const plan = billing?.plan || {};
  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="RECEITA" title="Plano e cobrança">
          Acompanhe seu plano, limites, consumo e gateways de pagamento.
        </PageHead>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Plano atual" value={billing?.subscription?.planName || "FREE"} accent />
          <Stat label="Canais ativos" value={usage.channels?.used ?? 0} sub={`limite ${fmtLimit(usage.channels?.limit)}`} />
          <Stat label="Ideias no mês" value={usage.ideas?.used ?? 0} sub={`limite ${fmtLimit(usage.ideas?.limit)}`} />
          <Stat label="Execuções no mês" value={usage.executions?.used ?? 0} sub={`limite ${fmtLimit(usage.executions?.limit)}`} />
        </div>

        <Panel title="Consumo">
          <div className="space-y-4">
            <Usage label="Canais" item={usage.channels} />
            <Usage label="Ideias do mês" item={usage.ideas} />
            <Usage label="Execuções do mês" item={usage.executions} />
          </div>
        </Panel>

        <div className="grid lg:grid-cols-3 gap-4 my-4">
          <PlanCard title="FREE" active={plan.code === "free"} text="Para validar um canal com limites iniciais." />
          <PlanCard title="STARTER" active={plan.code === "starter"} text="Até 3 canais, 100 ideias por mês e 20 execuções." href="/billing/checkout?plan=starter" />
          <PlanCard title="PRO" active={plan.code === "pro"} text="Até 10 canais, ideias e execuções ilimitadas." href="/billing/checkout?plan=pro" />
          <PlanCard title="AGENCY" active={plan.code === "agency"} text="Operação multiworkspace e prioridade de processamento." href="/billing/checkout?plan=agency" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Gateways">
            <Gateway name="Stripe" item={billing?.gateways?.stripe} />
            <Gateway name="Mercado Pago" item={billing?.gateways?.mercado_pago} />
            <Gateway name="PIX" item={billing?.gateways?.pix} />
          </Panel>
          <Panel title="Saúde comercial">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="IA ativa" value={health?.ai?.active || "local"} />
              <Stat label="Erros 24h" value={health?.recentErrors ?? "—"} />
              <Stat label="Chamadas IA 24h" value={health?.aiCalls24h ?? "—"} />
              <Stat label="Eventos billing 24h" value={health?.billingEvents24h ?? "—"} />
            </div>
            <Link href="/billing/history" className="inline-block mt-4 text-[11px] tracking-wider uppercase text-amber hover:text-ink">
              Ver histórico
            </Link>
          </Panel>
        </div>
      </Shell>
    </div>
  );
}

function Usage({ label, item }) {
  const used = Number(item?.used || 0);
  const limit = item?.limit == null ? null : Number(item.limit);
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-ink">{label}</span>
        <span className="text-ink-dim">{used} / {fmtLimit(limit)}</span>
      </div>
      <Bar value={pct} />
    </div>
  );
}

function Gateway({ name, item }) {
  return (
    <div className="flex justify-between items-center border-b border-line py-3">
      <span className="text-ink text-sm">{name}</span>
      <Tag tone={item?.configured ? "ok" : undefined}>{item?.configured ? "configurado" : "pendente"}</Tag>
    </div>
  );
}

function PlanCard({ title, text, active, href }) {
  return (
    <div className={`border p-5 bg-paper-2 ${active ? "border-amber" : "border-line"}`}>
      <div className="flex justify-between gap-3">
        <div className="text-2xl text-ink">{title}</div>
        {active && <Tag tone="ok">ativo</Tag>}
      </div>
      <p className="text-ink-dim text-sm mt-2 leading-relaxed">{text}</p>
      {!active && href && <Link href={href} className="inline-block mt-4 text-[11px] tracking-wider uppercase text-amber hover:text-ink">Assinar</Link>}
    </div>
  );
}

function fmtLimit(v) { return v == null ? "ilimitado" : v; }
