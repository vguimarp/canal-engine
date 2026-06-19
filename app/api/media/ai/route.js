import { NextResponse } from "next/server";
import { getDb, syncDb } from "@/lib/db";
import { getVideoById } from "@/lib/queries";
import { videoBelongsToWorkspace } from "@/lib/tenant";
import { generateImage, generateNarration, generateVideo } from "@/lib/mediaAI";
import { writeMediaFile } from "@/lib/mediaExport";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gera mídia REAL por IA (imagem/áudio/vídeo) com fallback automático.
// Aditivo: não altera o fluxo /api/media-factory existente.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const videoId = Number(body.videoId);
  const type = String(body.type || "image"); // image | audio | video
  if (!videoId) return NextResponse.json({ error: "videoId é obrigatório" }, { status: 400 });
  if (!videoBelongsToWorkspace(videoId)) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  const video = getVideoById(videoId);
  const db = getDb();

  const insert = (asset) => {
    const r = db.prepare(`INSERT INTO media_assets
      (channel_id, video_id, asset_type, platform, title, prompt, file_name, file_path, asset_mime, asset_content, metadata, status, risk_level)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'seguro')`).run(
      video.channel_id, videoId, asset.asset_type, asset.platform || null, asset.title || null,
      asset.prompt || null, asset.file_name || null, asset.file_path || null,
      asset.asset_mime || null, asset.asset_content || null, JSON.stringify(asset.metadata || {}), asset.status || "completed"
    );
    syncDb();
    return r.lastInsertRowid;
  };

  try {
    if (type === "image") {
      const prompt = `Thumbnail original sobre "${video.title}". Cinematográfico, alto contraste, sem texto, sem marcas/celebridades. 16:9.`;
      const res = await generateImage({ prompt, title: video.title, score: 85 });
      const file = writeMediaFile({ videoId, kind: "thumb-ai", ext: res.ext, buffer: res.buffer });
      const id = insert({ asset_type: "thumbnail", platform: "YouTube", title: `Thumbnail IA (${res.provider})`, prompt,
        file_name: file.fileName, file_path: file.filePath, asset_mime: res.mime, asset_content: res.buffer.toString("base64"),
        metadata: { provider: res.provider, fallback: res.fallback }, status: res.status });
      return NextResponse.json({ ok: true, type, provider: res.provider, fallback: res.fallback,
        preview: { url: `/api/media/${id}`, downloadUrl: `/api/media/${id}?download=1`, mime: res.mime } }, { status: 201 });
    }

    if (type === "audio") {
      const res = await generateNarration({ text: video.script || video.description || video.title });
      if (!res.ok) return NextResponse.json({ ok: false, type, provider: res.provider, status: res.status, message: res.message || "Narração indisponível sem provedor de áudio." }, { status: 200 });
      const file = writeMediaFile({ videoId, kind: "narration", ext: "mp3", buffer: res.buffer });
      const id = insert({ asset_type: "narration", platform: "Áudio IA", title: `Narração (${res.provider})`,
        file_name: file.fileName, file_path: file.filePath, asset_mime: res.mime, asset_content: res.buffer.toString("base64"),
        metadata: { provider: res.provider }, status: "completed" });
      return NextResponse.json({ ok: true, type, provider: res.provider,
        preview: { url: `/api/media/${id}`, downloadUrl: `/api/media/${id}?download=1`, mime: res.mime } }, { status: 201 });
    }

    if (type === "video") {
      const res = await generateVideo({ prompt: video.title, storyboard: null });
      const id = insert({ asset_type: "video_package", platform: "Vídeo IA", title: `Pacote de vídeo (${res.provider})`,
        prompt: res.message, metadata: { provider: res.provider, status: res.status }, status: res.status });
      return NextResponse.json({ ok: res.ok, type, provider: res.provider, status: res.status, message: res.message, assetId: id }, { status: 200 });
    }

    return NextResponse.json({ error: "type inválido (image|audio|video)" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Falha ao gerar mídia: " + (e?.message || e) }, { status: 500 });
  }
}
