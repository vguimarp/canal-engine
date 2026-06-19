import { NextResponse } from "next/server";
import { getLibrary, getLibraryOverview, addLibraryItem } from "@/lib/queries";
import { resolveBodyChannel, resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json(sp.get("view") === "overview" ? { videos: [], shorts: [], posts: [], thumbnails: [] } : []);
  const channelId = resolved.channelId;
  if (sp.get("view") === "overview") return NextResponse.json(getLibraryOverview(channelId));
  return NextResponse.json(getLibrary(channelId, sp.get("type")));
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { type, title, content } = body;
  if (!type || !content) return NextResponse.json({ error: "type e content são obrigatórios" }, { status: 400 });
  const resolved = resolveBodyChannel(body, { required: true });
  if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  addLibraryItem(resolved.channelId, { type, title, content });
  return NextResponse.json({ ok: true }, { status: 201 });
}
