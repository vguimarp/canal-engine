import { NextResponse } from "next/server";
import { getExecutionStatus } from "@/lib/queries";
import { currentWorkspaceId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getExecutionStatus(currentWorkspaceId()) || { status: "empty" });
}
