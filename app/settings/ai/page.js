"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Tag, Stat } from "@/components/ui";

export default function AISettingsPage() {
  const [status, setStatus] = useState(null);
  useEffect(() => { fetch("/api/ai/status").then((r) => r.json()).then(setStatus); }, []);
  const providers = status?.providers || {};
  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="CONFIGURAÇÕES" title="IA">
          Configure OpenAI, Claude e Gemini por variáveis de ambiente. O sistema troca automaticamente para fallback quando um provedor falha.
        </PageHead>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Provider ativo" value={status?.active || "local"} accent />
          <Stat label="OpenAI" value={providers.openai ? "ativo" : "pendente"} />
          <Stat label="Claude" value={providers.claude ? "ativo" : "pendente"} />
          <Stat label="Gemini" value={providers.gemini ? "ativo" : "pendente"} />
        </div>
        <Panel title="Fallback automático">
          {["openai", "claude", "gemini", "local"].map((p) => (
            <div key={p} className="flex items-center justify-between border-b border-line py-3">
              <span className="text-ink text-sm uppercase">{p}</span>
              <Tag tone={providers[p] ? "ok" : undefined}>{providers[p] ? "disponível" : "não configurado"}</Tag>
            </div>
          ))}
        </Panel>
      </Shell>
    </div>
  );
}
