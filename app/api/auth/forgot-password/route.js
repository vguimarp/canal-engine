import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/account";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const limited = rateLimit(request, { key: "forgot-password", limit: 5 });
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const result = await requestPasswordReset({
    email: body.email,
    channel: body.channel || "email",
    request,
    origin,
  });
  return NextResponse.json(result);
}
