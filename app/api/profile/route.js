import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { publicUser, updateProfile } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session?.uid) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  return NextResponse.json({ user: publicUser(getUserById(session.uid)) });
}

export async function PATCH(request) {
  const session = getSession();
  if (!session?.uid) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ user: updateProfile(session.uid, body, request) });
}
