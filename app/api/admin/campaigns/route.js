import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/users";
import { getDb, syncDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!isAdminUser(session?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const db = getDb();
  return NextResponse.json({
    campaigns: db.prepare("SELECT * FROM marketing_campaigns ORDER BY id DESC LIMIT 100").all(),
    consentCounts: {
      email: db.prepare("SELECT COUNT(*) c FROM users WHERE email_marketing_consent=1").get().c,
      whatsapp: db.prepare("SELECT COUNT(*) c FROM users WHERE whatsapp_marketing_consent=1").get().c,
      sms: db.prepare("SELECT COUNT(*) c FROM users WHERE sms_marketing_consent=1").get().c,
    },
  });
}

export async function POST(request) {
  const session = getSession();
  if (!isAdminUser(session?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const channel = String(body.channel || "email");
  if (!["email", "whatsapp", "sms"].includes(channel)) return NextResponse.json({ error: "Canal inválido." }, { status: 400 });
  const db = getDb();
  const r = db.prepare(`INSERT INTO marketing_campaigns (name, channel, status, audience, content, created_by)
    VALUES (?,?,?,?,?,?)`).run(
    String(body.name || "Campanha sem nome").slice(0, 160),
    channel,
    "draft",
    JSON.stringify(body.audience || { consentRequired: channel }),
    String(body.content || "").slice(0, 5000),
    session.uid
  );
  syncDb();
  return NextResponse.json({ id: r.lastInsertRowid, status: "draft", message: "Campanha preparada. Envio real exige provider configurado e consentimento do usuário." }, { status: 201 });
}
