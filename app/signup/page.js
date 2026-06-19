"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, Field } from "../login/page";

const initial = { name: "", email: "", password: "", confirmPassword: "", termsAccepted: false };

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("A confirmação de senha não confere."); return; }
    if (!form.termsAccepted) { setError("Aceite os Termos para continuar."); return; }
    setBusy(true); setError("");
    const r = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // privacidade acompanha o aceite dos termos (mesma caixa).
      body: JSON.stringify({ ...form, privacyAccepted: form.termsAccepted }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(data.error || "Não foi possível criar a conta."); return; }
    router.push("/completar-perfil"); router.refresh();
  };

  return (
    <AuthShell title="Criar conta grátis" subtitle="Leva 30 segundos. Complete o resto do perfil depois.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome" type="text" value={form.name} onChange={(v) => set("name", v)} placeholder="Seu nome" />
        <Field label="E-mail" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="voce@email.com" />
        <Field label="Senha" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="8+ caracteres, maiúscula, minúscula e número" />
        <Field label="Confirmar senha" type="password" value={form.confirmPassword} onChange={(v) => set("confirmPassword", v)} placeholder="repita a senha" />
        <Check checked={form.termsAccepted} onChange={(v) => set("termsAccepted", v)}>
          Li e aceito os <a href="/termos" className="text-amber hover:underline">Termos de Uso</a> e a <a href="/privacidade" className="text-amber hover:underline">Política de Privacidade</a>.
        </Check>
        {error && <div className="text-alert text-[12px]">{error}</div>}
        <button disabled={busy} className="w-full bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md hover:bg-ink transition-colors disabled:opacity-50">
          {busy ? "Criando..." : "Criar conta grátis"}
        </button>
      </form>
      <p className="text-ink-dim text-[12px] mt-5 text-center">
        Já tem conta? <Link href="/login" className="text-amber hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}

function Check({ checked, onChange, children }) {
  return (
    <label className="flex gap-2 items-start border border-line p-3 rounded-md bg-paper">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>{children}</span>
    </label>
  );
}
