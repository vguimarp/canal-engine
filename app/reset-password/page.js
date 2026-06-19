"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { AuthShell, Field } from "../login/page";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell title="Redefinir senha" subtitle="Carregando link seguro..." />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [remaining, setRemaining] = useState(60 * 60);
  const [busy, setBusy] = useState(false);
  const token = sp.get("token") || "";
  useEffect(() => {
    const t = setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage("");
    const r = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setStatus("error"); setMessage(data.error || "Não foi possível redefinir."); return; }
    setStatus("success");
    setMessage("Senha redefinida. Redirecionando para login...");
    setTimeout(() => router.push("/login"), 900);
  };

  return (
    <AuthShell title="Redefinir senha" subtitle="Crie uma nova senha forte.">
      <form onSubmit={submit} className="space-y-3">
        <div className={`border p-3 text-[12px] ${status === "success" ? "border-ok text-ok" : status === "error" ? "border-alert text-alert" : "border-line text-ink-dim"}`}>
          {status === "success" ? "Senha redefinida com sucesso." : status === "error" ? "Não foi possível redefinir. Solicite um novo link." : `Este link expira em aproximadamente ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}.`}
        </div>
        <Field label="Nova senha" type="password" value={password} onChange={setPassword} placeholder="8+ caracteres, letra e número" />
        <Field label="Confirmar nova senha" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="repita a senha" />
        {message && <div className="text-ink-dim text-[12px]">{message}</div>}
        <button disabled={busy || !token} className="w-full bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md disabled:opacity-50">
          {busy ? "Salvando..." : "Redefinir senha"}
        </button>
        <a href="/forgot-password" className="block text-center text-[12px] text-amber hover:underline">Reenviar link</a>
      </form>
    </AuthShell>
  );
}
