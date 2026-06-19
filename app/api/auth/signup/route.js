import { NextResponse } from "next/server";
import { createUser } from "@/lib/users";
import { setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const res = createUser(body || {});
  if (res?.error) return NextResponse.json(res, { status: 400 });
  setSessionCookie({ uid: res.id, email: res.email, plan: "free" });
  return NextResponse.json({ ok: true, user: { id: res.id, email: res.email, plan: "free" } }, { status: 201 });
}
