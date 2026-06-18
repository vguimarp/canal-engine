// ============================================================
// Pré-build do Vercel.
// Sempre gera data/canal.db (semente) para o bundle. Esse banco serve como:
//   • banco da aplicação, quando NÃO há Turso (modo demo, /tmp efêmero);
//   • FALLBACK de demonstração, se a conexão com o Turso falhar (auth/URL).
// Com Turso configurado corretamente, o app usa o Turso (durável) e este
// arquivo fica só como rede de segurança.
// ============================================================

import { execSync } from "child_process";

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  console.log("→ Turso configurado: o app usará o Turso. Gerando semente local como fallback...");
} else {
  console.log("→ Sem Turso: gerando banco-semente local (modo demo)...");
}
execSync("node scripts/seed.mjs", { stdio: "inherit" });
