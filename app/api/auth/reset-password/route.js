import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/account";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const limited = rateLimit(request, { key: "reset-password", limit: 8 });
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const result = resetPasswordWithToken(body.token, body.password, body.confirmPassword, request);
  if (result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
