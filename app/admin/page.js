"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Shell, PageHead, Panel, Stat } from "@/components/ui";

export default function AdminPage() {
  const [health, setHealth] = useState(null);
  const [full, setFull] = useState(null);
  useEffect(() => {
    fetch("/api/monitoring/health").then((r) => r.json()).then(setHealth);
    fetch("/api/health/full").then((r) => r.json()).then(setFull);
  }, []);
  return (
    <div className="flex">
      <Nav />
      <Shell>
        <PageHead eyebrow="ADMIN" title="Operação">
          Saúde, métricas e prontidão comercial do Canal Engine.
        </PageHead>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Status" value={health?.ok ? "ok" : "atenção"} accent />
          <Stat label="Erros 24h" value={health?.recentErrors ?? "—"} />
          <Stat label="IA 24h" value={health?.aiCalls24h ?? "—"} />
          <Stat label="Eventos billing" value={health?.billingEvents24h ?? "—"} />
        </div>
        <Panel title="Banco e produção">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Modo" value={full?.database?.mode || "—"} />
            <Stat label="Tabelas" value={full?.database?.tablesExist ?? "—"} />
            <Stat label="Planos" value={full?.database?.counts?.plans ?? "—"} />
            <Stat label="Usuários" value={full?.database?.counts?.users ?? "—"} />
          </div>
        </Panel>
      </Shell>
    </div>
  );
}
