import { NextResponse } from "next/server";
import { getMediaAssetFile } from "@/lib/mediaExport";
import { videoBelongsToWorkspace } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Mídia inválida." }, { status: 400 });
  const file = getMediaAssetFile(id);
  if (!file?.asset) return NextResponse.json({ error: "Arquivo de mídia não encontrado." }, { status: 404 });
  if (!videoBelongsToWorkspace(file.asset.video_id)) {
    return NextResponse.json({ error: "Mídia não encontrada neste workspace." }, { status: 404 });
  }
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(file.buffer, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.buffer.length),
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.fileName}"`,
    },
  });
}
