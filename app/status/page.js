"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Stat, Tag } from "@/components/ui";

export default function StatusPage() {
  const [status, setStatus] = useState(null);
  useEffect(() => { fetch("/api/health/full").then((r) => r.json()).then(setStatus); }, []);
  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="STATUS" title="Saúde do sistema">
          Estado de banco, billing, IA, deploy e uptime operacional.
        </PageHead>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Database" value={status?.database?.ok ? "ok" : "—"} accent />
          <Stat label="Billing" value={status ? readiness(status.billing) : "—"} />
          <Stat label="IA" value={status?.ai?.active || "—"} />
          <Stat label="Deploy" value={status?.database?.env?.onVercel ? "Vercel" : "local"} />
          <Stat label="Uptime" value={status?.monitoring?.ok ? "estável" : "atenção"} />
          <Stat label="Erros 24h" value={status?.monitoring?.recentErrors ?? "—"} />
        </div>
        <Panel title="Serviços">
          {["stripe", "mercado_pago", "pix"].map((k) => (
            <div key={k} className="flex justify-between border-b border-line py-3">
              <span className="text-ink text-sm">{k}</span>
              <Tag tone={status?.billing?.[k]?.configured ? "ok" : undefined}>{status?.billing?.[k]?.configured ? "configurado" : "pendente"}</Tag>
            </div>
          ))}
        </Panel>
      </Shell>
    </div>
  );
}

function readiness(billing = {}) {
  return Object.values(billing).some((v) => v.configured) ? "parcial" : "pendente";
}
