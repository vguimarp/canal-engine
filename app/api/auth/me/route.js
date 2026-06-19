import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getSession();
  return NextResponse.json({ user: s ? { id: s.uid, email: s.email, plan: s.plan } : null });
}
