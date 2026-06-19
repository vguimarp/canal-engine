import { NextResponse } from "next/server";
import { getChannelsWithStats, createChannel } from "@/lib/queries";
import { currentWorkspaceId } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { checkUsageLimit } from "@/lib/billing";

export const dynamic = "force-dynamic";

// Lista os canais da workspace atual (do usuário logado, ou a demo se anônimo).
export async function GET() {
  return NextResponse.json(getChannelsWithStats(currentWorkspaceId()));
}

// Cria um novo canal — vinculado à workspace/usuário atual.
export async function POST(request) {
  const data = await request.json().catch(() => ({}));
  const session = getSession();
  const workspaceId = currentWorkspaceId();
  const limit = checkUsageLimit({
    workspaceId,
    userId: session?.uid ?? null,
    metric: "channels",
    increment: 1,
  });
  if (!limit.allowed) return NextResponse.json({ error: limit.message, billing: limit.status }, { status: 402 });
  const result = createChannel(data, {
    workspaceId,
    ownerUserId: session?.uid ?? null,
  });
  if (result?.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
