"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag } from "@/components/ui";

const STATUS_LABEL = { aberto: "Aberto", em_analise: "Em análise", respondido: "Respondido", fechado: "Fechado" };
const STATUS_TONE = { aberto: "", em_analise: "", respondido: "ok", fechado: "alert" };

export default function Support() {
  const [tickets, setTickets] = useState(null); // null=carregando, []=vazio
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [needLogin, setNeedLogin] = useState(false);

  const load = async () => {
    const r = await fetch("/api/support");
    if (r.status === 401) { setNeedLogin(true); setTickets([]); return; }
    const d = await r.json().catch(() => ({}));
    setTickets(d.tickets || []);
  };
  useEffect(() => { load(); }, []);

  const open = async (e) => {
    e.preventDefault();
    setBusy(true); setNote("");
    const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setNote(`⚠ ${d.error || "Não foi possível abrir o chamado."}`); return; }
    setSubject(""); setMessage(""); setNote("✓ Chamado aberto! Responderemos em breve.");
    load();
  };

  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="AJUDA" title="Suporte">
          Abra um chamado e acompanhe o status. Respondemos por e-mail e aqui mesmo.
        </PageHead>

        {needLogin ? (
          <Panel title="Entre para abrir um chamado">
            <p className="text-ink-dim text-sm">Você precisa estar logado. <Link href="/login" className="text-amber hover:underline">Acessar minha conta</Link>.</p>
          </Panel>
        ) : (
          <>
            <Panel title="Abrir novo chamado">
              <form onSubmit={open} className="space-y-3">
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto" required
                  className="w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md focus:border-amber outline-none" />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva o que precisa…" rows={4} required
                  className="w-full bg-paper border border-line text-ink text-sm px-3 py-2 rounded-md focus:border-amber outline-none resize-none" />
                {note && <div className="text-sm text-ink">{note}</div>}
                <button disabled={busy} className="bg-amber text-paper text-sm font-bold uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-ink transition-colors disabled:opacity-50">
                  {busy ? "Enviando…" : "Abrir chamado"}
                </button>
              </form>
            </Panel>

            <h3 className="text-ink-dim text-[11px] tracking-widest uppercase mt-8 mb-3">Meus chamados</h3>
            {tickets === null ? (
              <div className="text-ink-dim text-sm py-6">Carregando…</div>
            ) : tickets.length === 0 ? (
              <div className="text-ink-dim text-sm py-6">Você ainda não tem chamados.</div>
            ) : (
              <div className="border border-line bg-paper-2 divide-y divide-line rounded-md overflow-hidden">
                {tickets.map((t) => (
                  <div key={t.id} className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-ink text-sm truncate">{t.subject}</span>
                      <Tag tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status] || t.status}</Tag>
                    </div>
                    <p className="text-ink-dim text-[12px] whitespace-pre-wrap">{t.message}</p>
                    {t.reply && <p className="text-ok text-[12px] mt-2 border-l-2 border-ok pl-2">Resposta: {t.reply}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Shell>
    </div>
  );
}
