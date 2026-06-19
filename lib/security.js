import { z } from "zod";

const buckets = new Map();
const WINDOW_MS = 60_000;

export const schemas = {
  signup: z.object({
    email: z.string().email().max(200),
    name: z.string().trim().max(120).optional().nullable(),
    password: z.string().min(6).max(200),
  }),
  login: z.object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(200),
  }),
  channel: z.object({
    name: z.string().trim().min(2).max(120),
    niche: z.string().trim().min(2).max(160),
    description: z.string().max(1000).optional().nullable(),
    target_audience: z.string().max(300).optional().nullable(),
    language: z.string().max(20).optional(),
    strategy: z.string().max(500).optional().nullable(),
    posting_frequency: z.string().max(120).optional().nullable(),
    main_goal: z.string().max(300).optional().nullable(),
    active: z.union([z.literal(0), z.literal(1)]).optional(),
  }),
  billingCheckout: z.object({
    planCode: z.enum(["starter", "pro", "agency"]),
    interval: z.enum(["monthly", "annual"]).default("monthly"),
    provider: z.enum(["stripe", "mercado_pago", "pix"]).default("stripe"),
  }),
};

export function validate(schema, input) {
  const parsed = schema.safeParse(input || {});
  if (parsed.success) return { data: parsed.data };
  return {
    error: "Dados inválidos. Revise os campos e tente novamente.",
    details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
  };
}

export function clientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
}

export function rateLimit(request, { key = "global", limit = 120 } = {}) {
  const now = Date.now();
  const id = `${key}:${clientIp(request)}`;
  const bucket = buckets.get(id) || { count: 0, reset: now + WINDOW_MS };
  if (bucket.reset < now) {
    bucket.count = 0;
    bucket.reset = now + WINDOW_MS;
  }
  bucket.count += 1;
  buckets.set(id, bucket);
  if (bucket.count > limit) {
    return Response.json({ error: "Muitas tentativas. Aguarde um minuto e tente novamente." }, { status: 429 });
  }
  return null;
}

export function safeError(error, fallback = "Falha inesperada.") {
  return String(error?.message || error || fallback)
    .replace(/sk-[A-Za-z0-9_\-]{8,}/g, "sk-***")
    .slice(0, 300);
}
