import { NextResponse } from "next/server";
import { getExecutionReport } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const id = Number(params.id);
  const report = Number.isFinite(id) ? getExecutionReport(id) : null;
  if (!report) return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });
  return NextResponse.json(report);
}
