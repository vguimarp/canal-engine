"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag } from "@/components/ui";

export default function BillingHistoryPage() {
  const [data, setData] = useState({ events: [], invoices: [] });
  useEffect(() => { fetch("/api/billing/history").then((r) => r.json()).then(setData); }, []);
  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="COBRANÇA" title="Histórico">
          Eventos de checkout, assinatura, PIX, webhooks e faturas.
        </PageHead>
        <Panel title="Faturas">
          <Rows rows={data.invoices || []} empty="Nenhuma fatura registrada ainda." />
        </Panel>
        <div className="mt-4">
          <Panel title="Eventos">
            <Rows rows={data.events || []} empty="Nenhum evento de cobrança registrado." />
          </Panel>
        </div>
      </Shell>
    </div>
  );
}

function Rows({ rows, empty }) {
  if (!rows.length) return <div className="text-ink-dim text-sm">{empty}</div>;
  return (
    <div className="divide-y divide-line">
      {rows.map((r) => (
        <div key={r.id} className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-ink text-sm truncate">{r.event_type || r.provider_invoice_id || r.plan_code || "registro"}</div>
            <div className="text-ink-dim text-[11px]">{r.provider} · {r.created_at}</div>
          </div>
          <Tag tone={["paid", "created", "active"].includes(r.status) ? "ok" : r.status === "failed" ? "alert" : undefined}>{r.status}</Tag>
        </div>
      ))}
    </div>
  );
}
