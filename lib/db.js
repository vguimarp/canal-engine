import Database from "libsql";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import { seedDatabase } from "./seedData.js";

// ============================================================
// Conexão de banco — driver libsql (drop-in do better-sqlite3, API síncrona).
//   • Sem Turso  → arquivo SQLite local (dev) ou /tmp (serverless).
//   • Com Turso  → réplica embarcada: lê local rápido, grava no Turso (durável).
//     Persistência real no Vercel: os dados sobrevivem entre invocações.
// O resto do sistema (lib/queries.js) não muda — mesma API síncrona.
// ============================================================

const SRC_DIR = process.cwd();
const SCHEMA_PATH = path.join(SRC_DIR, "lib", "schema.sql");

function execSchemaBestEffort(db, schema) {
  const statements = schema.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      db.exec(stmt + ";");
    } catch (e) {
      const msg = String(e?.message || e);
      // Bancos antigos podem ainda não ter colunas adicionadas por migrate().
      // Índices que usam essas colunas são reaplicados depois do ALTER TABLE.
      if (/no such column/i.test(msg) && /^CREATE\s+INDEX/i.test(stmt)) continue;
      throw e;
    }
  }
}

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

  // Réplicas embarcadas do Turso NÃO suportam transações de escrita explícitas
  // (BEGIN…COMMIT): as escritas são delegadas ao primário em autocommit. O helper
  // .transaction() do better-sqlite3/libsql lança nesse modo. Substituímos por um
  // executor em autocommit, preservando a assinatura `db.transaction(fn)(args)`
  // usada em todo o código (queries/rotas) — assim nada mais precisa mudar.
  if (USE_TURSO && !db.__txPatched) {
    db.transaction = (fn) => (...args) => fn(...args);
    db.__txPatched = true;
  }

  // Pragmas best-effort (algumas não se aplicam a réplicas — ignorar erros).
  for (const p of ["journal_mode = WAL", "foreign_keys = ON", "busy_timeout = 5000"]) {
    try { db.pragma(p); } catch { /* noop */ }
  }

  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  execSchemaBestEffort(db, schema);
  migrate(db);
  // IMPORTANTE: auto-seed só no banco LOCAL/demo (gravação em disco, rápida).
  // No Turso, semear ~1500 linhas pela rede dentro de uma request estoura o
  // timeout serverless (504). A população do Turso é feita por `npm run
  // turso:migrate` (offline, sem timeout).
  if (!USE_TURSO) autoSeedIfEmpty(db);
  if (USE_TURSO) { try { db.sync(); } catch { /* noop */ } }
  return db;
}

// Auto-semeia o banco LOCAL/demo quando vazio — operação em disco, rápida.
function autoSeedIfEmpty(db) {
  try {
    if (db.prepare("SELECT COUNT(*) c FROM channels").get().c > 0) return;
    db.transaction(() => {
      if (db.prepare("SELECT COUNT(*) c FROM channels").get().c > 0) return;
      seedDatabase(db);
    })();
    console.log("[db] Banco local vazio — populado com os 5 canais de demonstração.");
  } catch (e) {
    console.error("[db] Auto-seed falhou (seguindo com banco atual):", e?.message || e);
  }
}

// Migrações idempotentes para bancos criados antes de novas colunas.
// CREATE TABLE IF NOT EXISTS não adiciona colunas a tabelas já existentes,
// então aqui garantimos as colunas novas sem quebrar dados atuais.
function migrate(db) {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  // Reaplica o schema inteiro (idempotente) para bancos antigos receberem
  // tabelas e índices criados depois do primeiro seed.
  execSchemaBestEffort(db, schema);

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

  // Multiusuário (FASE 3) — colunas idempotentes.
  addColumn("users", "workspace_id", "INTEGER");
  addColumn("channels", "workspace_id", "INTEGER");
  addColumn("channels", "owner_user_id", "INTEGER");

  // Agora que colunas antigas foram garantidas, reaplica índices/tabelas finais.
  execSchemaBestEffort(db, schema);
  seedPlans(db);

  // Backfill REVERSÍVEL e idempotente: garante a workspace demo e atribui os
  // canais órfãos a ela (só escreve quando há o que migrar — cold-start leve).
  try {
    let demo = db.prepare("SELECT id FROM workspaces WHERE is_demo=1 ORDER BY id LIMIT 1").get();
    const orphans = db.prepare("SELECT COUNT(*) c FROM channels WHERE workspace_id IS NULL").get().c;
    if (orphans > 0 || !demo) {
      if (!demo) {
        const r = db.prepare("INSERT INTO workspaces (name, owner_user_id, is_demo) VALUES ('Demo', NULL, 1)").run();
        demo = { id: r.lastInsertRowid };
      }
      if (orphans > 0) db.prepare("UPDATE channels SET workspace_id=? WHERE workspace_id IS NULL").run(demo.id);
    }
  } catch { /* tabelas podem não existir num primeiro boot extremo — schema acima cria */ }
}

function seedPlans(db) {
  try {
    const stmt = db.prepare(`INSERT INTO plans
      (code, name, channel_limit, idea_limit_monthly, execution_limit_monthly, workspace_limit, priority_processing, active)
      VALUES (?,?,?,?,?,?,?,1)
      ON CONFLICT(code) DO UPDATE SET
        name=excluded.name,
        channel_limit=excluded.channel_limit,
        idea_limit_monthly=excluded.idea_limit_monthly,
        execution_limit_monthly=excluded.execution_limit_monthly,
        workspace_limit=excluded.workspace_limit,
        priority_processing=excluded.priority_processing,
        active=1`);
    stmt.run("free", "FREE", 1, 20, 5, 1, 0);
    stmt.run("pro", "PRO", 10, null, null, 1, 0);
    stmt.run("agency", "AGENCY", null, null, null, null, 1);
  } catch { /* schema antigo extremo: a próxima inicialização reaplica */ }
}

// Após escritas, garante propagação ao Turso (no-op quando local).
export function syncDb() {
  if (USE_TURSO && db) { try { db.sync(); } catch { /* noop */ } }
}

// Cliente HTTP remoto (lazy) para escritas em lote — muito mais rápido que
// gravar linha-a-linha pela réplica embarcada (que faz 1 round-trip por write).
let _remote;
function remoteClient() {
  if (!USE_TURSO) return null;
  if (!_remote) {
    _remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return _remote;
}

// Executa muitas escritas de forma eficiente.
//  • Turso  → @libsql/client.batch() (1 round-trip por lote) + sync na réplica.
//  • Local  → transação síncrona única.
// `statements`: array de { sql, args? }.
export async function batchWrite(statements) {
  if (!statements?.length) return 0;
  if (USE_TURSO) {
    const client = remoteClient();
    const CHUNK = 400;
    for (let i = 0; i < statements.length; i += CHUNK) {
      await client.batch(statements.slice(i, i + CHUNK).map((s) => ({ sql: s.sql, args: s.args || [] })), "write");
    }
    syncDb();
    return statements.length;
  }
  const d = getDb();
  d.transaction(() => {
    for (const s of statements) d.prepare(s.sql).run(...(s.args || []));
  })();
  return statements.length;
}
