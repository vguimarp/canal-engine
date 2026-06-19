import { NextResponse } from "next/server";
import { createFullUser } from "@/lib/account";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const limited = rateLimit(request, { key: "signup", limit: 8 });
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const res = createFullUser(body, request);
  if (res?.error) return NextResponse.json(res, { status: 400 });
  setSessionCookie({ uid: res.id, email: res.email, plan: "free", role: "user" });
  return NextResponse.json({ ok: true, user: { id: res.id, email: res.email, plan: "free", role: "user", status: "active" } }, { status: 201 });
}
