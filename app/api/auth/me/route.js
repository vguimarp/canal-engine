import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { publicUser } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getSession();
  const user = s?.uid ? getUserById(s.uid) : null;
  return NextResponse.json({ user: publicUser(user) });
}
