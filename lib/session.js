// ============================================================
// Sessão própria — JWT assinado com HMAC-SHA256 (Node crypto, sem deps).
// Cookie httpOnly. Substitui o NextAuth (incompatível com o toolchain aqui).
// ============================================================

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
export const SESSION_COOKIE = "ce_session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 dias

const sign = (data) => createHmac("sha256", SECRET).update(data).digest("base64url");

export function createToken(payload) {
  const body = { ...payload, exp: Date.now() + MAX_AGE * 1000 };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  try {
    const expected = sign(data);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const body = JSON.parse(Buffer.from(data, "base64url").toString());
    if (!body.exp || body.exp < Date.now()) return null;
    return body;
  } catch { return null; }
}

export function setSessionCookie(payload) {
  cookies().set(SESSION_COOKIE, createToken(payload), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function getSession() {
  try { return verifyToken(cookies().get(SESSION_COOKIE)?.value); } catch { return null; }
}
