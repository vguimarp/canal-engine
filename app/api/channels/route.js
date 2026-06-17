import { NextResponse } from "next/server";
import { getChannelsWithStats, createChannel } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Lista todos os canais já com estatísticas (cards, ranking, comparação).
export async function GET() {
  return NextResponse.json(getChannelsWithStats());
}

// Cria um novo canal.
export async function POST(request) {
  const data = await request.json().catch(() => ({}));
  const result = createChannel(data);
  if (result?.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
