import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/users";
import { getAdminUsers } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAdminUser(getSession()?.uid)) return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const sp = new URL(request.url).searchParams;
  const users = getAdminUsers({ q: sp.get("q") || "" });
  if (sp.get("format") === "csv") {
    const csv = ["id,email,name,phone,whatsapp,city,state,userType,plan,role,status"]
      .concat(users.map((u) => [u.id,u.email,u.name,u.phone,u.whatsapp,u.city,u.state,u.userType,u.plan,u.role,u.status].map(csvCell).join(",")))
      .join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"canal-engine-users.csv\"" } });
  }
  return NextResponse.json({ users });
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
