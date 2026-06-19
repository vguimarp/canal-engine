import { NextResponse } from "next/server";
import { getUserByEmail, verifyPassword } from "@/lib/users";
import { setSessionCookie } from "@/lib/session";
import { rateLimit, schemas, validate } from "@/lib/security";
import { getDb, syncDb } from "@/lib/db";
import { recordUserEvent } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const limited = rateLimit(request, { key: "login", limit: 12 });
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const parsed = validate(schemas.login, body);
  if (parsed.error) return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  const { email, password } = parsed.data;
  const user = getUserByEmail(email || "");
  if (!user || !verifyPassword(password || "", user.password_hash)) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }
  if (user.status === "inactive") {
    return NextResponse.json({ error: "Conta desativada. Fale com o suporte." }, { status: 403 });
  }
  getDb().prepare("UPDATE users SET last_login_at=datetime('now') WHERE id=?").run(user.id);
  syncDb();
  recordUserEvent({ userId: user.id, eventType: "login", request });
  setSessionCookie({ uid: user.id, email: user.email, plan: user.plan, role: user.role || "user" });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role || "user", status: user.status || "active" } });
}
