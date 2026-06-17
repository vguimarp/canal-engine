import { NextResponse } from "next/server";
import { getChannelById, updateChannel } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const channel = getChannelById(Number(params.id));
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
  return NextResponse.json(channel);
}

// Edita um canal (nome, nicho, estratégia, status ativo/inativo, etc.).
export async function PATCH(request, { params }) {
  const data = await request.json().catch(() => ({}));
  const updated = updateChannel(Number(params.id), data);
  if (updated === null) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
  return NextResponse.json(updated);
}
