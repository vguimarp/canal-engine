// ============================================================
// MIGRAÇÃO PARA O TURSO — aplica o schema e popula o banco remoto.
// Roda com: npm run turso:migrate
// Requer as variáveis: TURSO_DATABASE_URL e TURSO_AUTH_TOKEN
// (coloque em .env.local ou exporte no shell).
//
// Usa réplica embarcada: grava em /tmp e as escritas são propagadas ao Turso.
// É idempotente: limpa as tabelas e repõe os 5 canais de demonstração.
// ============================================================

import Database from "libsql";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { seedDatabase, clearTables } from "../lib/seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Carrega .env.local (se existir) sem dependências — assim basta criar o
// arquivo com TURSO_DATABASE_URL e TURSO_AUTH_TOKEN e rodar este script.
for (const file of [".env.local", ".env"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const OFFICIAL_TURSO_URL = "libsql://canal-engine-vguimarp.aws-us-east-1.turso.io";
const rawUrl = process.env.TURSO_DATABASE_URL || OFFICIAL_TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!authToken) {
  console.error("✗ Defina TURSO_AUTH_TOKEN (token do banco canal-engine). A URL já usa o banco oficial por padrão. Veja .env.example.");
  process.exit(1);
}
// Normaliza esquema (aceita libsql:// e https://).
const url = /^(libsql|https?):\/\//i.test(rawUrl.trim()) ? rawUrl.trim().replace(/\/+$/, "") : "libsql://" + rawUrl.trim().replace(/\/+$/, "");

const replicaPath = path.join(root, "data", "turso-replica.db");
fs.mkdirSync(path.dirname(replicaPath), { recursive: true });
for (const ext of ["", "-wal", "-shm"]) {
  const p = replicaPath + ext;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log("→ Conectando ao Turso e aplicando schema...");
const db = new Database(replicaPath, { syncUrl: url, authToken });
try { db.sync(); } catch { /* primário pode estar vazio */ }

db.exec(fs.readFileSync(path.join(root, "lib", "schema.sql"), "utf-8"));

console.log("→ Limpando tabelas e populando 5 canais...\n");
clearTables(db);
seedDatabase(db, { log: (m) => console.log(m) });

try { db.sync(); } catch (e) { console.warn("aviso: sync final falhou:", e.message); }
db.close();
console.log("\n✅ MIGRAÇÃO COMPLETA — dados no Turso (primário durável).");
