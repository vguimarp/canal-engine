import { NextResponse } from "next/server";
import { listBillingHistory } from "@/lib/billingProviders";
import { currentUserId, currentWorkspaceId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!currentUserId()) return NextResponse.json({ events: [], invoices: [] });
  return NextResponse.json(listBillingHistory({ workspaceId: currentWorkspaceId() }));
}
