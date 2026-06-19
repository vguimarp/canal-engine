// robots.txt (FASE 16) — gerado pelo Next.
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://canal-engine.vercel.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/recursos", "/pricing", "/faq", "/sobre", "/contato"],
        disallow: ["/admin", "/master", "/api/", "/profile", "/onboarding", "/settings", "/billing"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
