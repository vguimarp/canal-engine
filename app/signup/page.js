"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, Field } from "../login/page";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(data.error || "Não foi possível criar a conta."); return; }
    // signup já cria a sessão (cookie) — segue direto.
    router.push("/"); router.refresh();
  };

  return (
    <AuthShell title="Criar conta" subtitle="Comece grátis a testar seus nichos.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome" type="text" value={name} onChange={setName} placeholder="Seu nome" />
        <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" />
        <Field label="Senha" type="password" value={password} onChange={setPassword} placeholder="mín. 6 caracteres" />
        {error && <div className="text-alert text-[12px]">⚠ {error}</div>}
        <button disabled={busy} className="w-full bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md hover:bg-ink transition-colors disabled:opacity-50">
          {busy ? "Criando…" : "Criar conta grátis"}
        </button>
      </form>
      <p className="text-ink-dim text-[12px] mt-5 text-center">
        Já tem conta? <Link href="/login" className="text-amber hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
