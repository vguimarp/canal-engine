import { NextResponse } from "next/server";
import { getDb, syncDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Lista os tickets do usuário logado.
export async function GET() {
  const s = getSession();
  if (!s?.uid) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const tickets = getDb().prepare(
    "SELECT id, subject, message, status, reply, created_at, updated_at FROM support_tickets WHERE user_id=? ORDER BY id DESC LIMIT 100"
  ).all(s.uid);
  return NextResponse.json({ tickets });
}

// Abre um novo ticket.
export async function POST(request) {
  const s = getSession();
  if (!s?.uid) return NextResponse.json({ error: "Entre na sua conta para abrir um chamado." }, { status: 401 });
  const { subject, message } = await request.json().catch(() => ({}));
  if (!String(subject || "").trim() || !String(message || "").trim()) {
    return NextResponse.json({ error: "Assunto e mensagem são obrigatórios." }, { status: 400 });
  }
  const db = getDb();
  const r = db.prepare("INSERT INTO support_tickets (user_id, email, subject, message, status) VALUES (?,?,?,?, 'aberto')")
    .run(s.uid, s.email || null, String(subject).slice(0, 200), String(message).slice(0, 4000));
  syncDb();
  return NextResponse.json({ ok: true, id: r.lastInsertRowid, status: "aberto" }, { status: 201 });
}
