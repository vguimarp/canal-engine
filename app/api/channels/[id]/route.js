import { NextResponse } from "next/server";
import { getChannelById, updateChannel } from "@/lib/queries";
import { ownsChannel } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  if (!ownsChannel(Number(params.id))) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
  const channel = getChannelById(Number(params.id));
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
  return NextResponse.json(channel);
}

// Edita um canal (nome, nicho, estratégia, status ativo/inativo, etc.).
export async function PATCH(request, { params }) {
  if (!ownsChannel(Number(params.id))) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
  const data = await request.json().catch(() => ({}));
  const updated = updateChannel(Number(params.id), data);
  if (updated === null) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
  return NextResponse.json(updated);
}
