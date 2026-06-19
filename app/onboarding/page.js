"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field } from "../login/page";

const FIELDS = [
  ["whatsapp", "WhatsApp", "tel", "(11) 99999-9999"],
  ["phone", "Telefone", "tel", "(11) 99999-9999"],
  ["companyName", "Empresa", "text", "opcional"],
  ["city", "Cidade", "text", "São Paulo"],
  ["state", "Estado", "text", "SP"],
  ["country", "País", "text", "Brasil"],
  ["website", "Site", "url", "https://..."],
  ["niche", "Nicho", "text", "finanças, IA, educação..."],
  ["channelSize", "Tamanho do canal", "text", "0, 1k, 10k..."],
  ["mainGoal", "Objetivo principal", "text", "crescer audiência, monetizar..."],
];

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch("/api/profile").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.user) setForm((f) => ({ ...d.user, ...f })); }).catch(() => {});
  }, []);

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true);
    await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => {});
    setBusy(false); setDone(true);
    setTimeout(() => { router.push("/"); router.refresh(); }, 900);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-2xl">
        {/* ETAPA 17 — mensagem de sucesso pós-cadastro */}
        <div className="ce-card p-4 mb-4 text-center">
          <div className="text-ok text-sm font-bold">✓ Conta criada com sucesso.</div>
          <div className="text-ink-dim text-[12px]">Você já pode começar gratuitamente.</div>
        </div>

        <div className="text-center mb-6">
          <div className="text-amber text-xs tracking-[0.3em] mb-1">BEM-VINDO</div>
          <div className="serif text-2xl text-ink">Complete seu perfil</div>
          <p className="text-ink-dim text-[13px] mt-1">Ajude-nos a personalizar sua experiência. Tudo aqui é opcional.</p>
        </div>

        {/* Incentivo */}
        <div className="ce-card p-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <div className="text-ink text-sm font-bold">Complete seu perfil e ganhe créditos extras.</div>
        </div>

        <div className="ce-card p-7">
          {done ? (
            <div className="text-ok text-sm text-center py-6 fade-in">✓ Perfil salvo! Redirecionando…</div>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                {FIELDS.map(([k, label, type, ph]) => (
                  <Field key={k} label={label} type={type} value={form[k] || ""} onChange={(v) => set(k, v)} placeholder={ph} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <Link href="/" className="text-ink-dim text-[12px] hover:text-ink">Pular por enquanto</Link>
                <div className="flex gap-2">
                  <Link href="/" className="text-[11px] tracking-wider uppercase px-4 py-2.5 border border-line text-ink-dim rounded-md hover:text-ink">Ir para o painel</Link>
                  <button disabled={busy} className="bg-amber text-paper text-sm font-bold uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-ink transition-colors disabled:opacity-50">
                    {busy ? "Salvando…" : "Salvar e ganhar créditos"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
