import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/users";
import { updateAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const session = getSession();
  if (!isAdminUser(session?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ user: updateAdminUser(id, body, session.uid) });
}
