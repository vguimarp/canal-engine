"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Stat, Tag } from "@/components/ui";

const TABS = ["Dashboard", "Usuários", "CRM", "Workspaces", "Billing", "IA", "Mídia", "Logs", "Configurações"];

export default function AdminPage() {
  const [tab, setTab] = useState("Dashboard");
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    setError("");
    const endpoints = {
      summary: "/api/admin/summary",
      users: "/api/admin/users",
      workspaces: "/api/admin/workspaces",
      billing: "/api/admin/billing",
      media: "/api/admin/media",
      logs: "/api/admin/logs",
      settings: "/api/admin/settings",
    };
    const entries = await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
      const r = await fetch(url);
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Acesso restrito ao administrador.");
      return [key, body];
    }));
    setData(Object.fromEntries(entries));
  };

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  const updateUser = async (id, body) => {
    const r = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    setNote(r.ok ? "Usuário atualizado." : data.error || "Falha ao atualizar usuário.");
    if (r.ok) load().catch(() => {});
  };

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="MASTER ADMIN" title="Painel do Dono">
          Administração master de usuários, workspaces, CRM, billing, IA, mídia e logs.
        </PageHead>
        {error && <Panel title="Acesso restrito ao administrador"><div className="text-alert text-sm">{error}</div></Panel>}
        {note && <div className="mb-4 text-sm text-ink">{note}</div>}
        {!error && data.summary && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {TABS.map((t) => <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-3 py-1.5 border uppercase tracking-wide ${tab === t ? "border-amber text-amber" : "border-line text-ink-dim"}`}>{t}</button>)}
            </div>
            {tab === "Dashboard" && <Dashboard data={data.summary} />}
            {tab === "Usuários" && <Users users={data.users?.users || []} updateUser={updateUser} />}
            {tab === "CRM" && <Crm users={data.users?.users || []} />}
            {tab === "Workspaces" && <Rows title="Workspaces" rows={data.workspaces?.workspaces || []} fields={["name","owner_email","channels","ideas","videos","created_at"]} />}
            {tab === "Billing" && <Billing data={data.billing} />}
            {tab === "IA" && <Ia data={data.settings} />}
            {tab === "Mídia" && <Media data={data.media} />}
            {tab === "Logs" && <Logs data={data.logs} />}
            {tab === "Configurações" && <Settings data={data.settings} />}
          </>
        )}
      </Shell>
    </div>
  );
}

function Dashboard({ data }) {
  const t = data.totals || {};
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Usuários" value={t.users || 0} accent />
      <Stat label="Workspaces" value={t.workspaces || 0} />
      <Stat label="Canais" value={t.channels || 0} />
      <Stat label="Ideias" value={t.ideas || 0} />
      <Stat label="Thumbnails" value={t.thumbnails || 0} />
      <Stat label="Exportações" value={t.exports || 0} />
      <Stat label="Ativos" value={t.activeUsers || 0} />
      <Stat label="Erros 24h" value={t.errors24h || 0} />
    </div>
  );
}

function Users({ users, updateUser }) {
  return (
    <Panel title="Usuários">
      <div className="divide-y divide-line">
        {users.map((u) => (
          <div key={u.id} className="py-3 grid lg:grid-cols-[1fr_auto] gap-3">
            <div>
              <div className="text-ink text-sm">{u.name || "Sem nome"} · {u.email}</div>
              <div className="text-ink-dim text-[11px]">{u.phone || "-"} · {u.city || "-"} / {u.state || "-"} · {u.userType || "tipo não informado"}</div>
              <div className="flex gap-2 mt-2"><Tag>{u.plan}</Tag><Tag tone={u.role === "admin" ? "ok" : undefined}>{u.role}</Tag><Tag tone={u.status === "active" ? "ok" : undefined}>{u.status}</Tag></div>
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              {["free","starter","pro","agency"].map((p) => <button key={p} onClick={() => updateUser(u.id, { plan: p })} className="text-[10px] uppercase tracking-wide px-2 py-1 border border-line text-ink-dim">{p}</button>)}
              <button onClick={() => updateUser(u.id, { status: u.status === "active" ? "inactive" : "active" })} className="text-[10px] uppercase tracking-wide px-2 py-1 border border-line text-ink-dim">{u.status === "active" ? "desativar" : "ativar"}</button>
              <button onClick={() => updateUser(u.id, { role: u.role === "admin" ? "user" : "admin" })} className="text-[10px] uppercase tracking-wide px-2 py-1 border border-line text-ink-dim">{u.role === "admin" ? "remover admin" : "tornar admin"}</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Crm({ users }) {
  const consentEmail = users.filter((u) => u.emailMarketingConsent).length;
  const consentWhatsapp = users.filter((u) => u.whatsappMarketingConsent).length;
  const consentSms = users.filter((u) => u.smsMarketingConsent).length;
  return (
    <Panel title="CRM">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="E-mail permitido" value={consentEmail} />
        <Stat label="WhatsApp permitido" value={consentWhatsapp} />
        <Stat label="SMS permitido" value={consentSms} />
      </div>
      <a href="/api/admin/users?format=csv" className="text-[11px] tracking-wider uppercase text-amber">Exportar CSV</a>
      <Rows rows={users} fields={["email","phone","whatsapp","city","state","niche","userType","plan"]} />
    </Panel>
  );
}

function Billing({ data }) {
  return <Rows title="Billing" rows={[...(data?.subscriptions || []), ...(data?.events || []), ...(data?.webhooks || [])]} fields={["provider","plan_code","status","event_type","created_at"]} />;
}
function Ia({ data }) {
  return <Panel title="IA"><pre className="text-ink-dim text-xs whitespace-pre-wrap">{JSON.stringify(data?.ai || {}, null, 2)}</pre></Panel>;
}
function Media({ data }) {
  return <Rows title="Mídia" rows={data?.thumbnails || []} fields={["id","video_title","file_name","file_path","created_at"]} />;
}
function Logs({ data }) {
  return <Rows title="Logs" rows={[...(data?.userEvents || []), ...(data?.systemEvents || [])]} fields={["event_type","source","level","message","created_at"]} />;
}
function Settings({ data }) {
  return <Panel title="Configurações"><pre className="text-ink-dim text-xs whitespace-pre-wrap">{JSON.stringify(data || {}, null, 2)}</pre></Panel>;
}

function Rows({ title, rows = [], fields = [] }) {
  return (
    <Panel title={title || "Registros"}>
      {!rows.length ? <div className="text-ink-dim text-sm">Nenhum registro.</div> : (
        <div className="divide-y divide-line">
          {rows.map((r, i) => <div key={r.id || i} className="py-3 text-sm">
            {fields.map((f) => <span key={f} className="inline-block mr-4 text-ink-dim"><b className="text-ink">{f}:</b> {String(r[f] ?? "-").slice(0, 80)}</span>)}
          </div>)}
        </div>
      )}
    </Panel>
  );
}
