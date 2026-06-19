import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/aiProvider";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(aiStatus());
}
