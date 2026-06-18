import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Singleton de conexão — evita reabrir o banco a cada request no dev.
const SRC_DIR = process.cwd();
const SCHEMA_PATH = path.join(SRC_DIR, "lib", "schema.sql");

// Em serverless (Vercel) o filesystem é read-only, exceto /tmp. Por isso, em
// produção serverless usamos /tmp e copiamos um banco "semente" empacotado (se
// existir) na primeira execução. Localmente, nada muda: usa data/canal.db.
const ON_SERVERLESS = !!process.env.VERCEL;
const DB_PATH = ON_SERVERLESS ? "/tmp/canal.db" : path.join(SRC_DIR, "data", "canal.db");

function ensureWritableDb() {
  if (!ON_SERVERLESS || fs.existsSync(DB_PATH)) return;
  const bundled = path.join(SRC_DIR, "data", "canal.db");
  try { if (fs.existsSync(bundled)) fs.copyFileSync(bundled, DB_PATH); } catch { /* abre vazio e aplica schema */ }
}

let db;

export function getDb() {
  if (db) return db;
  ensureWritableDb();
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  // Garante schema aplicado
  const schema = fs.readFileSync(
    SCHEMA_PATH,
    "utf-8"
  );
  db.exec(schema);
  migrate(db);
  return db;
}

// Migrações idempotentes para bancos criados antes de novas colunas.
// CREATE TABLE IF NOT EXISTS não adiciona colunas a tabelas já existentes,
// então aqui garantimos as colunas novas sem quebrar dados atuais.
function migrate(db) {
  const schema = fs.readFileSync(
    SCHEMA_PATH,
    "utf-8"
  );
  // Reaplica o schema inteiro para bancos antigos receberem tabelas e indices
  // criados depois do primeiro seed. Os comandos sao idempotentes.
  db.exec(schema);

  const addColumn = (table, column, decl) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
  };
  // Colunas novas de SEO em keywords (Fase: SEO Profissional)
  addColumn("keywords", "video_id", "INTEGER");
  addColumn("keywords", "intent", "TEXT");
  addColumn("keywords", "difficulty", "REAL DEFAULT 0");
  addColumn("keywords", "potential", "REAL DEFAULT 0");

  // Colunas de gestão de canais (Fase: Multi-Canal)
  addColumn("channels", "target_audience", "TEXT");
  addColumn("channels", "language", "TEXT DEFAULT 'pt-BR'");
  addColumn("channels", "strategy", "TEXT");
  addColumn("channels", "posting_frequency", "TEXT");
  addColumn("channels", "main_goal", "TEXT");
  addColumn("channels", "active", "INTEGER DEFAULT 1");
}
