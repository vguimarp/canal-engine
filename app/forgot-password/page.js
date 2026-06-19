"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthShell, Field } from "../login/page";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState("email");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage("");
    const r = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, channel }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    setMessage(data.message || (r.ok ? "Verifique suas instruções de recuperação." : "Não foi possível solicitar recuperação."));
  };

  return (
    <AuthShell title="Recuperar senha" subtitle="Enviaremos um link seguro se a conta existir.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" />
        <label className="block">
          <span className="text-ink-dim text-[10px] tracking-widest uppercase">Canal</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}
            className="mt-1 w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md focus:border-amber outline-none">
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </label>
        {message && <div className="text-ink-dim text-[12px]">{message}</div>}
        <button disabled={busy} className="w-full bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md disabled:opacity-50">
          {busy ? "Enviando..." : "Enviar instruções"}
        </button>
      </form>
      <p className="text-ink-dim text-[12px] mt-5 text-center">
        <Link href="/login" className="text-amber hover:underline">Voltar ao login</Link>
      </p>
    </AuthShell>
  );
}
