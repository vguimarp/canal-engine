// ============================================================
// Usuários + hash de senha (scrypt nativo). SEM dependência de next-auth,
// para poder ser importado por rotas (ex.: signup) sem puxar o NextAuth.
// ============================================================

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "./db.js";

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
  return { id: r.lastInsertRowid, email: e, name: name || null };
}
