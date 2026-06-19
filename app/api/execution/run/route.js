import { NextResponse } from "next/server";
import { planExecution, runExecution } from "@/lib/execution";
import { currentWorkspaceId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const mode = sp.get("mode") || "seguro";
  const limits = {
    maxIdeas: sp.get("maxIdeas"),
    maxVideos: sp.get("maxVideos"),
    maxShorts: sp.get("maxShorts"),
    maxScheduledPosts: sp.get("maxScheduledPosts"),
    platforms: sp.get("platforms")?.split(",").filter(Boolean),
    calendarDays: sp.get("calendarDays"),
  };
  return NextResponse.json(planExecution({ mode, limits, workspaceId: currentWorkspaceId() }));
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  try {
    const result = await runExecution({ ...body, workspaceId: currentWorkspaceId() });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Falha ao executar operação." }, { status: 400 });
  }
}
