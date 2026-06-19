import { NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";
import { currentUserId } from "@/lib/tenant";
import { currentWorkspaceId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceId = currentWorkspaceId();
  const userId = currentUserId();
  return NextResponse.json(getBillingStatus({ workspaceId, userId }));
}
