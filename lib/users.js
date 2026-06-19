// ============================================================
// Usuários + hash de senha (scrypt nativo). SEM dependência de next-auth,
// para poder ser importado por rotas (ex.: signup) sem puxar o NextAuth.
// ============================================================

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb, syncDb } from "./db.js";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(":");
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(String(password), salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export function getUserByEmail(email) {
  return getDb().prepare("SELECT * FROM users WHERE email=?").get(String(email).toLowerCase().trim());
}

export function createUser({ email, name, password }) {
  const db = getDb();
  const e = String(email || "").toLowerCase().trim();
  if (!e || !password) return { error: "E-mail e senha são obrigatórios." };
  if (String(password).length < 6) return { error: "A senha precisa de ao menos 6 caracteres." };
  if (db.prepare("SELECT 1 FROM users WHERE email=?").get(e)) return { error: "Este e-mail já está cadastrado." };
  const r = db.prepare("INSERT INTO users (email, name, password_hash, plan) VALUES (?,?,?,?)")
    .run(e, name || null, hashPassword(password), "free");
  const userId = r.lastInsertRowid;
  // Cria a workspace própria do usuário e vincula (FASE 3 — isolamento).
  const ws = db.prepare("INSERT INTO workspaces (name, owner_user_id, is_demo) VALUES (?,?,0)")
    .run(`${name || e} — Workspace`, userId);
  db.prepare("UPDATE users SET workspace_id=? WHERE id=?").run(ws.lastInsertRowid, userId);
  db.prepare(`INSERT INTO channels
    (name, niche, description, target_audience, language, strategy, posting_frequency, main_goal, active, workspace_id, owner_user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    "Meu Primeiro Canal",
    "Nicho em validação",
    "Canal inicial criado automaticamente. Edite em Canais.",
    null,
    "pt-BR",
    "Validar nicho com ideias originais e métricas reais.",
    "1 vídeo/semana",
    "Validar potencial de crescimento e monetização.",
    1,
    ws.lastInsertRowid,
    userId
  );
  syncDb();
  return { id: userId, email: e, name: name || null, workspaceId: ws.lastInsertRowid };
}
