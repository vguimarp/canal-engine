"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag } from "@/components/ui";

export default function BillingSettingsPage() {
  const [status, setStatus] = useState(null);
  useEffect(() => { fetch("/api/billing/status").then((r) => r.json()).then(setStatus); }, []);
  const gateways = status?.gateways || {};
  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="CONFIGURAÇÕES" title="Billing">
          Status dos gateways de pagamento e webhooks em produção.
        </PageHead>
        <Panel title="Gateways">
          <Gateway name="Stripe Checkout e Portal" item={gateways.stripe} />
          <Gateway name="Mercado Pago" item={gateways.mercado_pago} />
          <Gateway name="PIX" item={gateways.pix} />
        </Panel>
      </Shell>
    </div>
  );
}

function Gateway({ name, item }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3">
      <span className="text-ink text-sm">{name}</span>
      <div className="flex gap-2">
        <Tag tone={item?.configured ? "ok" : undefined}>{item?.configured ? "chave ok" : "chave pendente"}</Tag>
        <Tag tone={item?.webhookConfigured ? "ok" : undefined}>{item?.webhookConfigured ? "webhook ok" : "webhook pendente"}</Tag>
      </div>
    </div>
  );
}
