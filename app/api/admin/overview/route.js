import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/users";
import { getAdminOverview } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!isAdminUser(session?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  return NextResponse.json(getAdminOverview());
}
