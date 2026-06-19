import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { changeUserPassword } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = getSession();
  if (!session?.uid) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = changeUserPassword(session.uid, body.currentPassword, body.newPassword, request);
  if (result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
