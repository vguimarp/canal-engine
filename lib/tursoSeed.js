// ============================================================
// Bulk-load rápido para o Turso (sem timeout serverless).
// Gera os dados de demonstração em memória (síncrono, <1s) e envia tudo ao
// Turso em poucos lotes via @libsql/client.batch() — uma ida à rede por lote,
// em vez de ~1500 syncs linha-a-linha (que estouravam o timeout).
// ============================================================

import Database from "libsql";
import { createClient } from "@libsql/client";
import fs from "fs";
import { seedDatabase } from "./seedData.js";

// Ordem de inserção: pais antes das filhas (mantém integridade de FKs).
const INSERT_ORDER = [
  "channels", "trends", "ideas", "videos", "social_posts", "keywords",
  "metrics", "thumbnails", "thumb_variants", "seo_packages", "distributions",
  "strategy", "learnings", "logs", "queues", "library_items",
];
// Para limpeza: ordem inversa (filhas antes das pais).
const DELETE_ORDER = [...INSERT_ORDER].reverse();

export async function seedTurso({ url, authToken, schemaPath, force = false }) {
  const schema = fs.readFileSync(schemaPath, "utf-8");

  // 1) Gera os dados em um banco em memória (rápido, mesma lógica do seed local).
  const mem = new Database(":memory:");
  mem.exec(schema);
  seedDatabase(mem);

  // 2) Cliente remoto do Turso (HTTP) e schema idempotente no primário.
  const client = createClient({ url, authToken });
  await client.executeMultiple(schema);

  // 3) Limpeza opcional (repõe do zero).
  if (force) {
    for (const t of DELETE_ORDER) {
      try { await client.execute(`DELETE FROM ${t}`); } catch { /* tabela pode estar vazia */ }
    }
  }

  // 4) Monta INSERTs preservando os ids (FKs continuam consistentes).
  const stmts = [];
  for (const table of INSERT_ORDER) {
    let rows;
    try { rows = mem.prepare(`SELECT * FROM ${table}`).all(); } catch { continue; }
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    const ph = cols.map(() => "?").join(",");
    const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${ph})`;
    for (const row of rows) stmts.push({ sql, args: cols.map((c) => row[c]) });
  }
  mem.close();

  // 5) Envia em lotes (batch = 1 round-trip cada; atômico por lote).
  const CHUNK = 400;
  for (let i = 0; i < stmts.length; i += CHUNK) {
    await client.batch(stmts.slice(i, i + CHUNK), "write");
  }
  client.close?.();
  return { statements: stmts.length, tables: INSERT_ORDER.length };
}
