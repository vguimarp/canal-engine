"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel } from "@/components/ui";

export default function ProfilePage() {
  const [form, setForm] = useState(null);
  const [note, setNote] = useState("");
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "" });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => setForm(d.user || {}));
  }, []);

  const save = async (e) => {
    e.preventDefault(); setNote("");
    const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json().catch(() => ({}));
    if (r.ok) { setForm(data.user); setNote("Perfil atualizado."); } else setNote(data.error || "Falha ao atualizar.");
  };
  const changePassword = async () => {
    const r = await fetch("/api/profile/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(password) });
    const data = await r.json().catch(() => ({}));
    setNote(r.ok ? "Senha alterada." : data.error || "Falha ao alterar senha.");
  };
  const deleteRequest = async () => {
    const r = await fetch("/api/profile/delete-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Solicitado pelo usuário" }) });
    const data = await r.json().catch(() => ({}));
    setNote(data.message || (r.ok ? "Solicitação registrada." : "Falha ao registrar solicitação."));
  };

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="CONTA" title="Meu Perfil">
          Seus dados, senha e consentimentos.
        </PageHead>
        {note && <div className="mb-4 text-sm text-ink">{note}</div>}
        {!form ? <Panel title="Carregando"><div className="text-ink-dim text-sm">Abrindo seus dados...</div></Panel> : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            <Panel title="Dados cadastrais">
              <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
                {["name","avatarUrl","phone","whatsapp","country","state","city","companyName","document","website","niche","channelSize","mainGoal"].map((k) => (
                  <label key={k} className="block">
                    <span className="text-ink-dim text-[10px] tracking-widest uppercase">{label(k)}</span>
                    <input value={form[k] || ""} onChange={(e) => set(k, e.target.value)}
                      className="mt-1 w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md focus:border-amber outline-none" />
                  </label>
                ))}
                <div className="md:col-span-2 grid md:grid-cols-3 gap-2 text-[12px] text-ink-dim">
                  <Check checked={form.emailMarketingConsent} onChange={(v) => set("emailMarketingConsent", v)}>E-mail marketing</Check>
                  <Check checked={form.whatsappMarketingConsent} onChange={(v) => set("whatsappMarketingConsent", v)}>WhatsApp marketing</Check>
                  <Check checked={form.smsMarketingConsent} onChange={(v) => set("smsMarketingConsent", v)}>SMS marketing</Check>
                </div>
                <button className="md:col-span-2 bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md">Salvar perfil</button>
              </form>
            </Panel>
            <div className="space-y-4">
              <Panel title="Alterar senha">
                <div className="space-y-3">
                  <input type="password" placeholder="Senha atual" value={password.currentPassword} onChange={(e) => setPassword((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md" />
                  <input type="password" placeholder="Nova senha forte" value={password.newPassword} onChange={(e) => setPassword((p) => ({ ...p, newPassword: e.target.value }))}
                    className="w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md" />
                  <button onClick={changePassword} className="w-full border border-amber text-amber text-xs uppercase tracking-wide py-2 rounded-md">Alterar senha</button>
                </div>
              </Panel>
              <Panel title="Exclusão de conta">
                <p className="text-ink-dim text-sm mb-3">Registre uma solicitação de exclusão. O processamento é manual para evitar perda acidental.</p>
                <button onClick={deleteRequest} className="w-full border border-line text-ink-dim text-xs uppercase tracking-wide py-2 rounded-md">Solicitar exclusão</button>
              </Panel>
            </div>
          </div>
        )}
      </Shell>
    </div>
  );
}

function label(k) {
  return ({ name: "Nome", avatarUrl: "Foto/avatar URL", phone: "Celular", whatsapp: "WhatsApp", country: "País", state: "Estado", city: "Cidade", companyName: "Empresa", document: "CPF/CNPJ", website: "Site", niche: "Nicho", channelSize: "Tamanho do canal", mainGoal: "Objetivo" })[k] || k;
}
function Check({ checked, onChange, children }) {
  return <label className="flex gap-2 border border-line p-3 rounded-md"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>;
}
