import { NextResponse } from "next/server";
import { createUser } from "@/lib/users";
import { setSessionCookie } from "@/lib/session";
import { rateLimit, schemas, validate } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const limited = rateLimit(request, { key: "signup", limit: 8 });
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const parsed = validate(schemas.signup, body);
  if (parsed.error) return NextResponse.json(parsed, { status: 400 });
  const res = createUser(parsed.data);
  if (res?.error) return NextResponse.json(res, { status: 400 });
  setSessionCookie({ uid: res.id, email: res.email, plan: "free" });
  return NextResponse.json({ ok: true, user: { id: res.id, email: res.email, plan: "free" } }, { status: 201 });
}
