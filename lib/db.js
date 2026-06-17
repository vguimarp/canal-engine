import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Singleton de conexão — evita reabrir o banco a cada request no dev.
const DB_PATH = path.join(process.cwd(), "data", "canal.db");

let db;

export function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  // Garante schema aplicado
  const schema = fs.readFileSync(
    path.join(process.cwd(), "lib", "schema.sql"),
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
    path.join(process.cwd(), "lib", "schema.sql"),
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
