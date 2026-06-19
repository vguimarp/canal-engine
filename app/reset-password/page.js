"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const token = sp.get("token") || "";

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
    if (!r.ok) { setMessage(data.error || "Não foi possível redefinir."); return; }
    setMessage("Senha redefinida. Redirecionando para login...");
    setTimeout(() => router.push("/login"), 900);
  };

  return (
    <AuthShell title="Redefinir senha" subtitle="Crie uma nova senha forte.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nova senha" type="password" value={password} onChange={setPassword} placeholder="8+ caracteres, letra e número" />
        <Field label="Confirmar nova senha" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="repita a senha" />
        {message && <div className="text-ink-dim text-[12px]">{message}</div>}
        <button disabled={busy || !token} className="w-full bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md disabled:opacity-50">
          {busy ? "Salvando..." : "Redefinir senha"}
        </button>
      </form>
    </AuthShell>
  );
}
