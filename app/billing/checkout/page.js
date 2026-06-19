"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag } from "@/components/ui";

export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={<CheckoutShell />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const params = useSearchParams();
  const initialPlan = params.get("plan") || "pro";
  const [planCode, setPlanCode] = useState(initialPlan);
  const [interval, setInterval] = useState("monthly");
  const [provider, setProvider] = useState("stripe");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const checkout = async () => {
    setBusy(true); setResult(null);
    const r = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode, interval, provider }),
    });
    setResult(await r.json().catch(() => ({ error: "Falha no checkout." })));
    setBusy(false);
  };

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="CHECKOUT" title="Assinar plano">
          Escolha plano, ciclo e gateway. Se o gateway estiver configurado, o checkout abre em seguida.
        </PageHead>
        <Panel title="Configurar assinatura">
          <div className="grid md:grid-cols-3 gap-4">
            <Select label="Plano" value={planCode} setValue={setPlanCode} options={[["pro", "PRO"], ["agency", "AGENCY"]]} />
            <Select label="Ciclo" value={interval} setValue={setInterval} options={[["monthly", "Mensal"], ["annual", "Anual"]]} />
            <Select label="Pagamento" value={provider} setValue={setProvider} options={[["stripe", "Stripe"], ["mercado_pago", "Mercado Pago"], ["pix", "PIX"]]} />
          </div>
          <button onClick={checkout} disabled={busy} className="mt-5 bg-amber text-paper text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-md hover:bg-ink disabled:opacity-50">
            {busy ? "Preparando..." : "Continuar"}
          </button>

          {result && (
            <div className="mt-5 border border-line bg-paper p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag tone={result.checkoutReady ? "ok" : result.error ? "alert" : undefined}>{result.checkoutReady ? "pronto" : "atenção"}</Tag>
                <span className="text-ink text-sm">{result.provider || provider}</span>
              </div>
              <p className="text-ink-dim text-sm leading-relaxed">{result.message || result.error || "Checkout criado."}</p>
              {result.checkoutUrl && (
                <a href={result.checkoutUrl} className="inline-block mt-4 text-[11px] tracking-wider uppercase text-amber hover:text-ink">
                  Abrir checkout
                </a>
              )}
              {result.pixKey && <div className="mt-3 text-sm text-ink">Chave PIX: {result.pixKey}</div>}
            </div>
          )}
        </Panel>
      </Shell>
    </div>
  );
}

function CheckoutShell() {
  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="CHECKOUT" title="Assinar plano">
          Preparando checkout.
        </PageHead>
      </Shell>
    </div>
  );
}

function Select({ label, value, setValue, options }) {
  return (
    <label>
      <span className="text-ink-dim text-[10px] tracking-widest uppercase">{label}</span>
      <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
