"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Stat, Tag } from "@/components/ui";

const TABS = ["Usuários", "Assinaturas", "Cobranças", "Logs", "IA", "Sistema"];

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Usuários");

  useEffect(() => {
    fetch("/api/admin/overview").then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Acesso negado.");
      return body;
    }).then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ADMIN" title="Operação SaaS">
          Usuários, assinaturas, cobranças, logs, IA e sistema.
        </PageHead>
        {error && <Panel title="Acesso restrito"><div className="text-alert text-sm">{error}</div></Panel>}
        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Stat label="MRR" value={money(data.kpis.mrrCents)} accent />
              <Stat label="ARR" value={money(data.kpis.arrCents)} />
              <Stat label="Receita" value={money(data.kpis.revenueCents)} />
              <Stat label="Conversão" value={`${data.kpis.conversionRate}%`} />
              <Stat label="Usuários" value={data.kpis.users} />
              <Stat label="Ativos" value={data.kpis.activeUsers} />
              <Stat label="Canais" value={data.kpis.channels} />
              <Stat label="Vídeos" value={data.kpis.videos} />
              <Stat label="Uso IA" value={data.kpis.aiCalls} />
              <Stat label="Custos IA" value={money(data.kpis.aiCostCents)} />
              <Stat label="ROI" value={data.kpis.roi} />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 border uppercase tracking-wide ${tab === t ? "border-amber text-amber" : "border-line text-ink-dim"}`}>{t}</button>)}
            </div>
            <Panel title={tab}>
              <Rows rows={rowsFor(data, tab)} />
            </Panel>
          </>
        )}
      </Shell>
    </div>
  );
}

function rowsFor(data, tab) {
  if (tab === "Usuários") return data.users;
  if (tab === "Assinaturas") return data.subscriptions;
  if (tab === "Cobranças") return data.billing;
  if (tab === "Logs") return data.logs;
  if (tab === "IA") return data.ai;
  return data.system.plans || [];
}

function Rows({ rows = [] }) {
  if (!rows.length) return <div className="text-ink-dim text-sm">Nenhum registro.</div>;
  return (
    <div className="divide-y divide-line">
      {rows.map((r, i) => (
        <div key={r.id || r.plan_code || i} className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-ink text-sm truncate">{r.email || r.event_type || r.message || r.task || r.plan_code || r.provider || "registro"}</div>
            <div className="text-ink-dim text-[11px] truncate">{r.name || r.created_at || r.status || `total ${r.count}`}</div>
          </div>
          {(r.plan || r.status || r.role) && <Tag tone={r.status === "active" || r.role === "admin" ? "ok" : undefined}>{r.plan || r.status || r.role}</Tag>}
        </div>
      ))}
    </div>
  );
}

function money(cents = 0) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
