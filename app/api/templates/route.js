import { NextResponse } from "next/server";
import { PLATFORMS, PLATFORM_TEMPLATES } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(PLATFORMS.map((p) => ({ ...p, template: PLATFORM_TEMPLATES[p.key] })));
}
