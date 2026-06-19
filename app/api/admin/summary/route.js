import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/users";
import { getAdminSummary } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminUser(getSession()?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  return NextResponse.json(getAdminSummary());
}
