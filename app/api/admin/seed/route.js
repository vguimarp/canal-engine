import { NextResponse } from "next/server";
import path from "path";
import { getDb, syncDb } from "@/lib/db";
import { seedDatabase } from "@/lib/seedData";
import { seedTurso } from "@/lib/tursoSeed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OFFICIAL_TURSO_URL = "libsql://canal-engine-vguimarp.aws-us-east-1.turso.io";

// Popula o banco em uso — server-side, onde as variáveis existem.
//  • Com token → bulk-load rápido no Turso via @libsql/client.batch().
//  • Sem token → seed local (demo).
// Idempotente: só semeia se vazio (use ?force=1 para repor).
export async function POST(request) {
  const sp = new URL(request.url).searchParams;
  const force = sp.get("force") === "1";
  const token = process.env.TURSO_AUTH_TOKEN;
  const url = process.env.TURSO_DATABASE_URL || OFFICIAL_TURSO_URL;

  // Segurança: `force` (apaga e repõe) é destrutivo. Em produção/Turso exige
  // segredo, para um endpoint público não conseguir zerar dados de ninguém.
  if (force && token) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || sp.get("secret") !== secret) {
      return NextResponse.json(
        { ok: false, error: "force exige ?secret= válido (defina ADMIN_SECRET no ambiente)." },
        { status: 403 }
      );
    }
  }

  // Estado atual.
  let before;
  try { before = getDb().prepare("SELECT COUNT(*) c FROM channels").get().c; }
  catch (e) { return NextResponse.json({ ok: false, error: `db: ${e?.message || e}` }, { status: 500 }); }

  if (before > 0 && !force) {
    return NextResponse.json({ ok: true, seeded: false, reason: "já populado", channels: before });
  }

  try {
    if (token) {
      // Caminho Turso (rápido, em lotes).
      const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
      const res = await seedTurso({ url, authToken: token, schemaPath, force });
      // Re-sincroniza a réplica local desta instância para refletir já.
      syncDb();
      const after = countAfter();
      return NextResponse.json({ ok: true, seeded: true, mode: "turso", inserted: res.statements, after }, { status: 201 });
    }
    // Caminho local/demo (síncrono).
    const db = getDb();
    db.transaction(() => {
      if (force) for (const t of ["seo_packages","thumb_variants","distributions","social_posts","metrics","thumbnails","keywords","queues","logs","library_items","strategy","videos","ideas","trends","channels"]) { try { db.exec(`DELETE FROM ${t}`); } catch {} }
      seedDatabase(db);
    })();
    return NextResponse.json({ ok: true, seeded: true, mode: "demo", after: countAfter() }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `seed: ${e?.message || e}` }, { status: 500 });
  }
}

function countAfter() {
  const db = getDb();
  try { syncDb(); } catch {}
  const c = (t, w = "") => { try { return db.prepare(`SELECT COUNT(*) c FROM ${t} ${w}`).get().c; } catch { return -1; } };
  return {
    channels: c("channels"), ideas: c("ideas"), videos: c("videos", "WHERE format='long'"),
    keywords: c("keywords"), seo_packages: c("seo_packages"),
  };
}

export async function GET() {
  return NextResponse.json({ usage: "POST /api/admin/seed (ou ?force=1). Com token popula o Turso em lotes; sem token, modo demo." });
}
