import { NextResponse } from "next/server";
import { getLibrary, getLibraryOverview, addLibraryItem } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const channelId = Number(sp.get("channelId") || sp.get("channel") || 1);
  if (sp.get("view") === "overview") return NextResponse.json(getLibraryOverview(channelId));
  return NextResponse.json(getLibrary(channelId, sp.get("type")));
}

export async function POST(request) {
  const { channelId = 1, type, title, content } = await request.json().catch(() => ({}));
  if (!type || !content) return NextResponse.json({ error: "type e content são obrigatórios" }, { status: 400 });
  addLibraryItem(channelId, { type, title, content });
  return NextResponse.json({ ok: true }, { status: 201 });
}
