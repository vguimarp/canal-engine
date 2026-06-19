import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Diagnóstico de ambiente e banco — SEM expor segredos (apenas presença/tamanho).
// Prova tecnicamente se o runtime enxerga as variáveis do Turso e o estado do banco.
export async function GET() {
  const env = {
    onVercel: !!process.env.VERCEL,
    tursoUrlPresent: !!process.env.TURSO_DATABASE_URL,
    tursoUrlHost: process.env.TURSO_DATABASE_URL
      ? String(process.env.TURSO_DATABASE_URL).replace(/^\w+:\/\//, "").split("?")[0]
      : null,
    tursoTokenPresent: !!process.env.TURSO_AUTH_TOKEN,
    tursoTokenLength: process.env.TURSO_AUTH_TOKEN ? String(process.env.TURSO_AUTH_TOKEN).length : 0,
  };

  // Modo efetivo: só o token liga o Turso (URL tem default oficial embutido).
  const mode = env.tursoTokenPresent ? "turso" : "demo";

  const TABLES = [
    "users", "workspaces",
    "channels", "trends", "ideas", "videos", "social_posts", "keywords",
    "metrics", "thumbnails", "thumb_variants", "seo_packages", "distributions",
    "strategy", "learnings", "logs", "queues", "library_items",
    "media_assets", "execution_runs", "execution_steps", "execution_reports",
  ];

  let dbOk = true, dbError = null;
  const counts = {};
  try {
    const db = getDb();
    for (const t of TABLES) {
      try { counts[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c; }
      catch (e) { counts[t] = `erro: ${e.message}`; }
    }
  } catch (e) {
    dbOk = false; dbError = e?.message || String(e);
  }

  return NextResponse.json({
    ok: dbOk,
    mode,
    env,
    dbError,
    tablesExist: dbOk ? Object.keys(counts).length : 0,
    counts,
    timestamp: new Date().toISOString(),
  });
}
