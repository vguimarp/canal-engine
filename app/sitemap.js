// sitemap.xml (FASE 16) — páginas públicas indexáveis.
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://canal-engine.vercel.app";

export default function sitemap() {
  const now = new Date();
  const routes = ["", "/recursos", "/pricing", "/faq", "/sobre", "/contato", "/login", "/signup"];
  return routes.map((r) => ({
    url: `${BASE}${r}`,
    lastModified: now,
    changeFrequency: r === "" ? "daily" : "weekly",
    priority: r === "" ? 1 : 0.7,
  }));
}
