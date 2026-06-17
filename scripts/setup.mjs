#!/usr/bin/env node
// ============================================================
// Instalação automática — roda com: node scripts/setup.mjs
// Prepara o banco e confirma que está tudo pronto.
// ============================================================

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

console.log("\n🎬 Canal Engine — Instalação\n");

// 1) Verifica node_modules
if (!fs.existsSync(path.join(root, "node_modules"))) {
  console.log("→ Instalando dependências (pode levar 1-2 min)...");
  execSync("npm install", { cwd: root, stdio: "inherit" });
} else {
  console.log("✓ Dependências já instaladas");
}

// 2) Popula o banco
console.log("→ Preparando banco de dados com conteúdo de exemplo...");
execSync("node scripts/seed.mjs", { cwd: root, stdio: "inherit" });

console.log("\n✅ Tudo pronto!\n");
console.log("Agora rode:  npm run dev");
console.log("E abra no navegador:  http://localhost:3000\n");
console.log("Dica: clique no botão grande \"Fazer tudo agora\" na primeira tela.\n");
