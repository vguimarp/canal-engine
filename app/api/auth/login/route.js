import { NextResponse } from "next/server";
import { getUserByEmail, verifyPassword } from "@/lib/users";
import { setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { email, password } = await request.json().catch(() => ({}));
  const user = getUserByEmail(email || "");
  if (!user || !verifyPassword(password || "", user.password_hash)) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }
  setSessionCookie({ uid: user.id, email: user.email, plan: user.plan });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
}
