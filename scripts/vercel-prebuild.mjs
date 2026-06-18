// ============================================================
// Pré-build do Vercel.
//  • Com TURSO_DATABASE_URL  → não seeda arquivo: o app usa o Turso (durável).
//  • Sem Turso               → seeda data/canal.db para empacotar no bundle
//                              (modo demo, escritas efêmeras em /tmp).
// ============================================================

import { execSync } from "child_process";

if (process.env.TURSO_DATABASE_URL) {
  console.log("→ Turso configurado: pulando seed de arquivo local (fonte = Turso).");
} else {
  console.log("→ Sem Turso: gerando banco-semente local para o bundle...");
  execSync("node scripts/seed.mjs", { stdio: "inherit" });
}
