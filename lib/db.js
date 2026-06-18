import Database from "libsql";
import fs from "fs";
import path from "path";

// ============================================================
// Conexão de banco — driver libsql (drop-in do better-sqlite3, API síncrona).
//   • Sem Turso  → arquivo SQLite local (dev) ou /tmp (serverless).
//   • Com Turso  → réplica embarcada: lê local rápido, grava no Turso (durável).
//     Persistência real no Vercel: os dados sobrevivem entre invocações.
// O resto do sistema (lib/queries.js) não muda — mesma API síncrona.
// ============================================================

const SRC_DIR = process.cwd();
const SCHEMA_PATH = path.join(SRC_DIR, "lib", "schema.sql");

const ON_SERVERLESS = !!process.env.VERCEL;
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const USE_TURSO = !!TURSO_URL;

// Caminho do arquivo local (réplica, quando Turso; banco real, quando local).
const LOCAL_PATH = ON_SERVERLESS ? "/tmp/canal.db" : path.join(SRC_DIR, "data", "canal.db");

// Sem Turso e em serverless: copia o banco-semente empacotado para /tmp.
function ensureWritableDb() {
  if (USE_TURSO || !ON_SERVERLESS || fs.existsSync(LOCAL_PATH)) return;
  const bundled = path.join(SRC_DIR, "data", "canal.db");
  try { if (fs.existsSync(bundled)) fs.copyFileSync(bundled, LOCAL_PATH); } catch { /* abre vazio e aplica schema */ }
}

let db;

export function getDb() {
  if (db) return db;

  if (USE_TURSO) {
    // Réplica embarcada: arquivo local sincronizado com o Turso.
    db = new Database(LOCAL_PATH, { syncUrl: TURSO_URL, authToken: TURSO_TOKEN });
    try { db.sync(); } catch { /* primeira sync pode falhar se o primário ainda está vazio */ }
  } else {
    ensureWritableDb();
    db = new Database(LOCAL_PATH);
  }

  // Pragmas best-effort (algumas não se aplicam a réplicas — ignorar erros).
  for (const p of ["journal_mode = WAL", "foreign_keys = ON", "busy_timeout = 5000"]) {
    try { db.pragma(p); } catch { /* noop */ }
  }

  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  migrate(db);
  if (USE_TURSO) { try { db.sync(); } catch { /* noop */ } }
  return db;
}

// Migrações idempotentes para bancos criados antes de novas colunas.
// CREATE TABLE IF NOT EXISTS não adiciona colunas a tabelas já existentes,
// então aqui garantimos as colunas novas sem quebrar dados atuais.
function migrate(db) {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  // Reaplica o schema inteiro (idempotente) para bancos antigos receberem
  // tabelas e índices criados depois do primeiro seed.
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

// Após escritas, garante propagação ao Turso (no-op quando local).
export function syncDb() {
  if (USE_TURSO && db) { try { db.sync(); } catch { /* noop */ } }
}
