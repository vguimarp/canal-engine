import { NextResponse } from "next/server";
import { getDb, syncDb } from "@/lib/db";
import { seedDatabase } from "@/lib/seedData";

export const dynamic = "force-dynamic";
// Mais tempo para popular o Turso pela rede sem estourar (Hobby: até 60s).
export const maxDuration = 60;

// Popula o banco em uso (Turso, se houver token) — server-side, onde as
// variáveis existem. Idempotente: só semeia se estiver vazio (use ?force=1
// para forçar). Não expõe segredos.
export async function POST(request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  let db;
  try { db = getDb(); }
  catch (e) { return NextResponse.json({ ok: false, error: `db: ${e?.message || e}` }, { status: 500 }); }

  const before = db.prepare("SELECT COUNT(*) c FROM channels").get().c;
  if (before > 0 && !force) {
    return NextResponse.json({ ok: true, seeded: false, reason: "já populado", channels: before });
  }

  try {
    db.transaction(() => {
      if (force) {
        // Limpa antes de repor (ordem segura: filhas primeiro via DELETE em todas).
        for (const t of ["seo_packages","thumb_variants","distributions","social_posts","metrics","thumbnails","keywords","queues","logs","library_items","strategy","videos","ideas","trends","channels"]) {
          try { db.exec(`DELETE FROM ${t}`); } catch {}
        }
      }
      seedDatabase(db);
    })();
    syncDb(); // propaga ao Turso
  } catch (e) {
    return NextResponse.json({ ok: false, error: `seed: ${e?.message || e}` }, { status: 500 });
  }

  const after = {
    channels: db.prepare("SELECT COUNT(*) c FROM channels").get().c,
    ideas: db.prepare("SELECT COUNT(*) c FROM ideas").get().c,
    videos: db.prepare("SELECT COUNT(*) c FROM videos WHERE format='long'").get().c,
    keywords: db.prepare("SELECT COUNT(*) c FROM keywords").get().c,
    seo_packages: db.prepare("SELECT COUNT(*) c FROM seo_packages").get().c,
  };
  return NextResponse.json({ ok: true, seeded: true, after }, { status: 201 });
}

// GET amigável: informa como usar.
export async function GET() {
  return NextResponse.json({ usage: "POST /api/admin/seed (ou ?force=1 para repor). Popula o banco se vazio." });
}
