import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getVideos, getIdeaById, produceVideoFromIdea } from "@/lib/queries";
import { generateThumbnail, generateDerivatives,
  generateThumbnailSet, generateDistribution } from "@/lib/skills";
import { AIProvider } from "@/lib/aiProvider";
import { currentUserId, ideaBelongsToWorkspace, resolveBodyChannel, resolveChannelId } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const resolved = resolveChannelId(request);
  if (resolved.error) return NextResponse.json([]);
  return NextResponse.json(getVideos(resolved.channelId));
}

// Produz um vídeo completo a partir de uma ideia aprovada (Fase 1 — pipeline).
// Gera pacote (título/descrição/roteiro), thumbnail e derivados, e persiste.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { ideaId } = body;
  if (!ideaId) return NextResponse.json({ error: "ideaId é obrigatório" }, { status: 400 });
  if (!ideaBelongsToWorkspace(Number(ideaId))) return NextResponse.json({ error: "Ideia não encontrada" }, { status: 404 });

  const idea = getIdeaById(ideaId);
  if (!idea) return NextResponse.json({ error: "Ideia não encontrada" }, { status: 404 });
  const resolved = resolveBodyChannel({ ...body, channelId: idea.channel_id }, { required: true });
  if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const channelId = resolved.channelId;
  if (idea.channel_id !== channelId)
    return NextResponse.json({ error: "Ideia não pertence a este canal" }, { status: 400 });
  if (idea.format !== "long")
    return NextResponse.json({ error: "Só ideias de formato longo viram vídeo" }, { status: 400 });

  // Impede produzir a mesma ideia duas vezes.
  const exists = getDb()
    .prepare("SELECT 1 FROM videos WHERE idea_id=? AND format='long' LIMIT 1")
    .get(ideaId);
  if (exists) return NextResponse.json({ error: "Esta ideia já foi produzida" }, { status: 409 });

  const ai = new AIProvider({ workspaceId: resolved.workspaceId, userId: currentUserId(), channelId });
  const pkg = await ai.generateScript(idea);
  const thumb = generateThumbnail({ ...idea, title: pkg.title });
  const derivatives = generateDerivatives({ ...idea, title: pkg.title });
  const seo = await ai.generateSEO(idea, pkg);                   // SEO automático
  const thumbSet = generateThumbnailSet({ ...idea, title: pkg.title }); // 3 variações
  const distItems = generateDistribution({ ...idea, title: pkg.title }, seo); // multiplataforma

  // Itens reaproveitáveis para a Biblioteca de conteúdo.
  const libraryItems = [
    { type: "titulo", title: pkg.title, content: pkg.title },
    { type: "descricao", title: `Descrição — ${idea.topic}`, content: seo.description },
    { type: "hashtags", title: `Hashtags — ${idea.topic}`, content: (seo.hashtags || []).join(" ") },
    { type: "prompt", title: `Prompt thumb — ${idea.topic}`, content: thumbSet.variants[0].prompt },
    { type: "roteiro", title: `Roteiro — ${idea.topic}`, content: pkg.script },
  ];

  const result = produceVideoFromIdea(channelId, idea, pkg, thumb, derivatives, seo,
    { thumbSet, distItems, libraryItems });

  return NextResponse.json(
    { videoId: result.videoId, title: pkg.title, shorts: result.shorts, posts: result.posts,
      seoScore: seo.seoScore, keywords: seo.keywords.length,
      thumbVariants: thumbSet.variants.length, recommendedThumb: thumbSet.recommendedVariant,
      platforms: distItems.length },
    { status: 201 }
  );
}
