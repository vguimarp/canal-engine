import { NextResponse } from "next/server";
import { getExecutionStatus } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getExecutionStatus() || { status: "empty" });
}
