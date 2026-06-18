// ============================================================
// SEED LOCAL — recria o banco de demonstração (5 canais).
// Roda com: npm run seed
// Para popular o Turso (produção), use: npm run turso:migrate
// ============================================================

import Database from "libsql";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { seedDatabase } from "../lib/seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DB_PATH = path.join(root, "data", "canal.db");

// Recria do zero (remove WAL/SHM órfãos também).
fs.mkdirSync(path.join(root, "data"), { recursive: true });
for (const ext of ["", "-wal", "-shm"]) {
  const p = DB_PATH + ext;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const db = new Database(DB_PATH);
for (const p of ["journal_mode = WAL", "foreign_keys = ON", "busy_timeout = 5000"]) {
  try { db.pragma(p); } catch { /* noop */ }
}
db.exec(fs.readFileSync(path.join(root, "lib", "schema.sql"), "utf-8"));

console.log("→ Banco criado. Populando 5 canais...\n");
seedDatabase(db, { log: (m) => console.log(m) });
db.close();
console.log("\n✅ SEED COMPLETO — 5 canais em data/canal.db");
