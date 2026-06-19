import { NextResponse } from "next/server";
import { buildVideoExportMarkdown, buildVideoExportPackage } from "@/lib/mediaExport";
import { currentUserId, videoBelongsToWorkspace } from "@/lib/tenant";
import { recordUserEvent } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const videoId = Number(params.videoId);
  if (!videoId) return NextResponse.json({ error: "Vídeo inválido." }, { status: 400 });
  if (!videoBelongsToWorkspace(videoId)) {
    return NextResponse.json({ error: "Vídeo não encontrado neste workspace." }, { status: 404 });
  }
  const pack = buildVideoExportPackage(videoId);
  if (!pack) return NextResponse.json({ error: "Pacote não encontrado." }, { status: 404 });
  recordUserEvent({ userId: currentUserId(), eventType: "export_package", metadata: { videoId } });
  const format = new URL(request.url).searchParams.get("format") || "json";
  if (format === "md" || format === "markdown") {
    const body = buildVideoExportMarkdown(pack);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="canal-engine-video-${videoId}.md"`,
      },
    });
  }
  return NextResponse.json(pack, {
    headers: { "Content-Disposition": `attachment; filename="canal-engine-video-${videoId}.json"` },
  });
}
