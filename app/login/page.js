"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    setBusy(false);
    if (!r.ok) { setError("E-mail ou senha incorretos."); return; }
    router.push("/"); router.refresh();
  };

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua central de canais.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" />
        <Field label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        {error && <div className="text-alert text-[12px]">⚠ {error}</div>}
        <button disabled={busy} className="w-full bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md hover:bg-ink transition-colors disabled:opacity-50">
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-ink-dim text-[12px] mt-5 text-center">
        Não tem conta? <Link href="/signup" className="text-amber hover:underline">Criar conta</Link>
      </p>
      <p className="text-ink-dim text-[12px] mt-2 text-center">
        <Link href="/forgot-password" className="text-amber hover:underline">Esqueci minha senha</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children, wide = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-sm"}`}>
        <div className="text-center mb-6">
          <div className="text-amber text-xs tracking-[0.3em] mb-1">DOSSIÊ</div>
          <div className="serif text-2xl text-ink">Canal Engine</div>
        </div>
        <div className="ce-card p-7">
          <h1 className="serif text-xl text-ink mb-1">{title}</h1>
          <p className="text-ink-dim text-[12px] mb-5">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-ink-dim text-[10px] tracking-widest uppercase">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
        className="mt-1 w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md focus:border-amber outline-none" />
    </label>
  );
}
