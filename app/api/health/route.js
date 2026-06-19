import { NextResponse } from "next/server";
import { databaseHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

// Diagnóstico de ambiente e banco — SEM expor segredos (apenas presença/tamanho).
// Prova tecnicamente se o runtime enxerga as variáveis do Turso e o estado do banco.
export async function GET() {
  const db = databaseHealth();
  return NextResponse.json({
    ok: db.ok,
    mode: db.mode,
    env: db.env,
    dbError: db.error,
    tablesExist: db.tablesExist,
    counts: db.counts,
    timestamp: new Date().toISOString(),
  });
}
