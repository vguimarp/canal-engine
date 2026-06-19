import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requestAccountDeletion } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = getSession();
  if (!session?.uid) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(requestAccountDeletion(session.uid, body.reason, request));
}
