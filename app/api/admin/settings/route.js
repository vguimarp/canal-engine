import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/users";
import { getAdminSettings, updateAdminSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminUser(getSession()?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  return NextResponse.json(getAdminSettings());
}

export async function PATCH(request) {
  if (!isAdminUser(getSession()?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(updateAdminSettings(body));
}
