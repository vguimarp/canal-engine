import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getSession();
  const user = s?.uid ? getUserById(s.uid) : null;
  return NextResponse.json({ user: user ? { id: user.id, email: user.email, plan: user.plan, role: user.role || "user" } : null });
}
