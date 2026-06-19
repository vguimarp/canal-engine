"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, Field } from "../login/page";

const initial = {
  name: "", email: "", password: "", confirmPassword: "",
  phone: "", whatsapp: "", country: "Brasil", state: "", city: "",
  userType: "criador", companyName: "", document: "", website: "",
  niche: "", channelSize: "", mainGoal: "", acquisitionSource: "",
  termsAccepted: false, privacyAccepted: false,
  emailMarketingConsent: false, whatsappMarketingConsent: false, smsMarketingConsent: false,
};

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(data.error || "Não foi possível criar a conta."); return; }
    router.push("/"); router.refresh();
  };

  return (
    <AuthShell wide title="Criar conta" subtitle="Comece grátis com uma workspace própria e limites do plano FREE.">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Nome completo" type="text" value={form.name} onChange={(v) => set("name", v)} placeholder="Seu nome" />
          <Field label="E-mail" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="voce@email.com" />
          <Field label="Senha forte" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="8+ caracteres, letra e número" />
          <Field label="Confirmar senha" type="password" value={form.confirmPassword} onChange={(v) => set("confirmPassword", v)} placeholder="repita a senha" />
          <Field label="Celular" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="(11) 99999-9999" />
          <Field label="WhatsApp" type="tel" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="(11) 99999-9999" />
          <Field label="País" type="text" value={form.country} onChange={(v) => set("country", v)} placeholder="Brasil" />
          <Field label="Estado" type="text" value={form.state} onChange={(v) => set("state", v)} placeholder="SP" />
          <Field label="Cidade" type="text" value={form.city} onChange={(v) => set("city", v)} placeholder="São Paulo" />
          <label className="block">
            <span className="text-ink-dim text-[10px] tracking-widest uppercase">Tipo de usuário</span>
            <select value={form.userType} onChange={(e) => set("userType", e.target.value)}
              className="mt-1 w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md focus:border-amber outline-none">
              <option value="criador">Criador de conteúdo</option>
              <option value="agencia">Agência</option>
              <option value="empresa">Empresa</option>
              <option value="afiliado">Afiliado</option>
              <option value="infoprodutor">Infoprodutor</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <Field label="Empresa" type="text" value={form.companyName} onChange={(v) => set("companyName", v)} placeholder="opcional" />
          <Field label="CPF/CNPJ" type="text" value={form.document} onChange={(v) => set("document", v)} placeholder="opcional" />
          <Field label="Site" type="url" value={form.website} onChange={(v) => set("website", v)} placeholder="https://..." />
          <Field label="Nicho principal" type="text" value={form.niche} onChange={(v) => set("niche", v)} placeholder="finanças, IA, educação..." />
          <Field label="Tamanho do canal" type="text" value={form.channelSize} onChange={(v) => set("channelSize", v)} placeholder="0, 1k, 10k..." />
          <Field label="Objetivo principal" type="text" value={form.mainGoal} onChange={(v) => set("mainGoal", v)} placeholder="crescer audiência, monetizar..." />
          <Field label="Como conheceu" type="text" value={form.acquisitionSource} onChange={(v) => set("acquisitionSource", v)} placeholder="Google, indicação, anúncio..." />
        </div>

        <div className="grid md:grid-cols-2 gap-2 text-[12px] text-ink-dim">
          <Check checked={form.termsAccepted} onChange={(v) => set("termsAccepted", v)}>Aceito os Termos de Uso</Check>
          <Check checked={form.privacyAccepted} onChange={(v) => set("privacyAccepted", v)}>Aceito a Política de Privacidade</Check>
          <Check checked={form.emailMarketingConsent} onChange={(v) => set("emailMarketingConsent", v)}>Aceito receber novidades por e-mail</Check>
          <Check checked={form.whatsappMarketingConsent} onChange={(v) => set("whatsappMarketingConsent", v)}>Aceito receber mensagens por WhatsApp</Check>
          <Check checked={form.smsMarketingConsent} onChange={(v) => set("smsMarketingConsent", v)}>Aceito receber mensagens por SMS</Check>
        </div>

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
