import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserActivity } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session?.uid) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  return NextResponse.json(getUserActivity(session.uid));
}
