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
// Banco OFICIAL embutido como padrão: assim basta fornecer o TOKEN (1 segredo),
// e a URL nunca diverge do banco do token — elimina o erro de mismatch.
const OFFICIAL_TURSO_URL = "libsql://canal-engine-vguimarp.aws-us-east-1.turso.io";
const TURSO_URL_RAW = process.env.TURSO_DATABASE_URL || OFFICIAL_TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
// O token é o que liga o Turso. Sem token → modo demo (não quebra).
const USE_TURSO = !!TURSO_TOKEN;

// Normaliza a URL de sync: aceita libsql:// e https://; sem esquema, assume
// libsql://. Remove barras finais. (Turso aceita ambos os esquemas no sync.)
function normalizeTursoUrl(u) {
  if (!u) return u;
  const s = u.trim().replace(/\/+$/, "");
  if (/^(libsql|https?):\/\//i.test(s)) return s;
  return "libsql://" + s;
}
const TURSO_URL = normalizeTursoUrl(TURSO_URL_RAW);

// Caminhos: réplica embarcada (Turso) e banco de demonstração (fallback/local).
const REPLICA_PATH = ON_SERVERLESS ? "/tmp/canal.db" : path.join(SRC_DIR, "data", "canal-replica.db");
const DEMO_PATH = ON_SERVERLESS ? "/tmp/canal-demo.db" : path.join(SRC_DIR, "data", "canal.db");

// Abre o banco local de demonstração (copia o semente empacotado em serverless).
function openDemo() {
  if (ON_SERVERLESS && !fs.existsSync(DEMO_PATH)) {
    const bundled = path.join(SRC_DIR, "data", "canal.db");
    try { if (fs.existsSync(bundled)) fs.copyFileSync(bundled, DEMO_PATH); } catch { /* abre vazio */ }
  }
  return new Database(DEMO_PATH);
}

let db;

export function getDb() {
  if (db) return db;

  if (USE_TURSO) {
    try {
      // Réplica embarcada: arquivo local sincronizado com o Turso.
      db = new Database(REPLICA_PATH, { syncUrl: TURSO_URL, authToken: TURSO_TOKEN });
      db.sync(); // valida o handshake de auth logo de cara
    } catch (e) {
      // Auth/URL inválidos NÃO derrubam a aplicação: degrada para demo local.
      console.error(
        `[db] Falha ao conectar no Turso (${e?.message || e}). ` +
        `Usando banco LOCAL de demonstração. Verifique no Vercel: ` +
        `TURSO_DATABASE_URL e TURSO_AUTH_TOKEN precisam ser do MESMO banco; ` +
        `o token deve ser um JWT criado com 'turso db tokens create <db>'.`
      );
      db = openDemo();
    }
  } else {
    console.warn("[db] Sem TURSO_AUTH_TOKEN — usando banco local de demonstração. " +
      "Defina TURSO_AUTH_TOKEN (token do banco canal-engine) para persistência durável.");
    db = openDemo();
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
