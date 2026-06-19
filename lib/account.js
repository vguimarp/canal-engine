import { createHash, randomBytes, scryptSync } from "crypto";
import { getDb, syncDb } from "./db.js";
import { hashPassword, verifyPassword } from "./users.js";
import { logEvent } from "./monitoring.js";

export const USER_TYPES = ["criador", "agencia", "empresa", "afiliado", "infoprodutor", "outro"];
export const PLANS = ["free", "starter", "pro", "agency"];

export function strongPassword(password = "") {
  const p = String(password);
  return p.length >= 8 && /[A-ZÀ-Ý]/.test(p) && /[a-zà-ÿ]/.test(p) && /\d/.test(p);
}

export function cleanPhone(value = "") {
  return String(value || "").replace(/\D/g, "");
}

export function validateSignupInput(data = {}) {
  // Cadastro ULTRA SIMPLES: obrigatórios apenas nome, e-mail, senha,
  // confirmação e aceite dos termos. Todo o resto é OPCIONAL (preenchido
  // depois em "Completar perfil"). Campos opcionais só são validados se vierem.
  const errors = [];
  const email = String(data.email || "").toLowerCase().trim();
  const phone = cleanPhone(data.phone);
  const whatsapp = cleanPhone(data.whatsapp || data.phone);
  if (!String(data.name || "").trim()) errors.push("Nome é obrigatório.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("E-mail inválido.");
  if (!strongPassword(data.password)) errors.push("A senha precisa ter ao menos 8 caracteres, letra maiúscula, letra minúscula e número.");
  if (data.password !== data.confirmPassword) errors.push("A confirmação de senha não confere.");
  if (phone && (phone.length < 10 || phone.length > 15)) errors.push("Telefone celular inválido.");
  if (data.whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) errors.push("WhatsApp inválido.");
  // Aceite: basta os Termos (a Política de Privacidade acompanha o mesmo aceite).
  if (!data.termsAccepted) errors.push("Aceite os Termos de Uso para continuar.");
  return { ok: errors.length === 0, errors, email, phone, whatsapp };
}

export function recordUserEvent({ userId, eventType, metadata = {}, request = null }) {
  const db = getDb();
  db.prepare(`INSERT INTO user_events (user_id, event_type, metadata, ip, user_agent)
    VALUES (?,?,?,?,?)`).run(
    userId || null,
    eventType,
    JSON.stringify(metadata || {}),
    request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || request?.headers?.get("x-real-ip") || null,
    request?.headers?.get("user-agent") || null
  );
  syncDb();
}

export function syncMarketingContacts(userId, user) {
  const db = getDb();
  const up = db.prepare(`INSERT INTO marketing_contacts (user_id, channel, value, consent, updated_at)
    VALUES (?,?,?,?,datetime('now'))
    ON CONFLICT(user_id, channel) DO UPDATE SET value=excluded.value, consent=excluded.consent, updated_at=datetime('now')`);
  up.run(userId, "email", user.email, user.email_marketing_consent ? 1 : 0);
  up.run(userId, "whatsapp", user.whatsapp || user.phone || "", user.whatsapp_marketing_consent ? 1 : 0);
  up.run(userId, "sms", user.phone || "", user.sms_marketing_consent ? 1 : 0);
}

export function saveConsent(userId, type, accepted, source = "signup") {
  getDb().prepare("INSERT INTO user_consents (user_id, type, accepted, source) VALUES (?,?,?,?)")
    .run(userId, type, accepted ? 1 : 0, source);
}

export function createFullUser(data = {}, request = null) {
  const validation = validateSignupInput(data);
  if (!validation.ok) return { error: validation.errors[0], details: validation.errors };
  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email=?").get(validation.email)) {
    return { error: "Este e-mail já está cadastrado." };
  }
  const now = new Date().toISOString();
  // userType é opcional no cadastro simples: usa default válido se não vier.
  const rawType = String(data.userType || data.user_type || "");
  const userType = USER_TYPES.includes(rawType) ? rawType : "criador";
  const r = db.prepare(`INSERT INTO users (
    email, name, password_hash, phone, whatsapp, country, state, city, user_type,
    company_name, document, website, niche, channel_size, main_goal, acquisition_source,
    plan, role, status, email_marketing_consent, whatsapp_marketing_consent, sms_marketing_consent,
    terms_accepted_at, privacy_accepted_at, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    validation.email,
    String(data.name || "").trim(),
    hashPassword(data.password),
    validation.phone,
    validation.whatsapp,
    String(data.country || "").trim(),
    String(data.state || "").trim(),
    String(data.city || "").trim(),
    userType,
    data.companyName || data.company_name || null,
    data.document || null,
    data.website || null,
    data.niche || null,
    data.channelSize || data.channel_size || null,
    data.mainGoal || data.main_goal || null,
    data.acquisitionSource || data.acquisition_source || null,
    "free",
    "user",
    "active",
    data.emailMarketingConsent ? 1 : 0,
    data.whatsappMarketingConsent ? 1 : 0,
    data.smsMarketingConsent ? 1 : 0,
    now,
    now,
    now
  );
  const userId = r.lastInsertRowid;
  const ws = db.prepare("INSERT INTO workspaces (name, owner_user_id, owner_id, is_demo) VALUES (?,?,?,0)")
    .run(`${data.name || validation.email} — Workspace`, userId, userId);
  db.prepare("UPDATE users SET workspace_id=? WHERE id=?").run(ws.lastInsertRowid, userId);
  db.prepare(`INSERT INTO channels
    (name, niche, description, language, strategy, posting_frequency, main_goal, active, workspace_id, owner_user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    "Meu Primeiro Canal",
    data.niche || "Nicho em validação",
    "Canal inicial criado automaticamente. Edite em Canais.",
    "pt-BR",
    "Validar nicho com ideias originais e métricas reais.",
    "1 vídeo/semana",
    data.mainGoal || "Validar potencial de crescimento e monetização.",
    1,
    ws.lastInsertRowid,
    userId
  );
  db.prepare(`INSERT INTO subscriptions (user_id, workspace_id, plan_code, status, provider)
    VALUES (?,?,?,?,?)`).run(userId, ws.lastInsertRowid, "free", "active", "manual");
  for (const [type, accepted] of [
    ["terms", true],
    ["privacy", true],
    ["email_marketing", !!data.emailMarketingConsent],
    ["whatsapp_marketing", !!data.whatsappMarketingConsent],
    ["sms_marketing", !!data.smsMarketingConsent],
  ]) saveConsent(userId, type, accepted, "signup");
  syncMarketingContacts(userId, {
    email: validation.email,
    phone: validation.phone,
    whatsapp: validation.whatsapp,
    email_marketing_consent: data.emailMarketingConsent ? 1 : 0,
    whatsapp_marketing_consent: data.whatsappMarketingConsent ? 1 : 0,
    sms_marketing_consent: data.smsMarketingConsent ? 1 : 0,
  });
  syncDb();
  recordUserEvent({ userId, eventType: "signup", metadata: { userType }, request });
  return { id: userId, email: validation.email, name: data.name, plan: "free", role: "user", status: "active", workspaceId: ws.lastInsertRowid };
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    avatarUrl: row.avatar_url,
    country: row.country,
    state: row.state,
    city: row.city,
    userType: row.user_type,
    companyName: row.company_name,
    document: row.document,
    website: row.website,
    niche: row.niche,
    channelSize: row.channel_size,
    mainGoal: row.main_goal,
    acquisitionSource: row.acquisition_source,
    leadStatus: row.lead_status,
    crmTags: parseList(row.crm_tags),
    plan: row.plan,
    role: row.role || "user",
    status: row.status || "active",
    emailMarketingConsent: !!row.email_marketing_consent,
    whatsappMarketingConsent: !!row.whatsapp_marketing_consent,
    smsMarketingConsent: !!row.sms_marketing_consent,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export function updateProfile(userId, data = {}, request = null) {
  const db = getDb();
  const allowed = {
    name: "name",
    phone: "phone",
    whatsapp: "whatsapp",
    avatarUrl: "avatar_url",
    country: "country",
    state: "state",
    city: "city",
    companyName: "company_name",
    document: "document",
    website: "website",
    niche: "niche",
    channelSize: "channel_size",
    mainGoal: "main_goal",
    acquisitionSource: "acquisition_source",
    emailMarketingConsent: "email_marketing_consent",
    whatsappMarketingConsent: "whatsapp_marketing_consent",
    smsMarketingConsent: "sms_marketing_consent",
  };
  const sets = [];
  const vals = [];
  for (const [input, column] of Object.entries(allowed)) {
    if (!(input in data)) continue;
    sets.push(`${column}=?`);
    const value = input.endsWith("Consent") ? (data[input] ? 1 : 0) : data[input];
    vals.push(value);
  }
  if (!sets.length) return publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(userId));
  sets.push("updated_at=datetime('now')");
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id=?`).run(...vals, userId);
  const row = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
  syncMarketingContacts(userId, row);
  for (const key of ["emailMarketingConsent", "whatsappMarketingConsent", "smsMarketingConsent"]) {
    if (key in data) saveConsent(userId, key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`), data[key], "profile");
  }
  syncDb();
  recordUserEvent({ userId, eventType: "profile_updated", metadata: Object.keys(data), request });
  return publicUser(row);
}

export function getUserActivity(userId) {
  const db = getDb();
  const workspaceId = db.prepare("SELECT workspace_id FROM users WHERE id=?").get(userId)?.workspace_id;
  const events = db.prepare("SELECT event_type, metadata, created_at FROM user_events WHERE user_id=? ORDER BY id DESC LIMIT 60").all(userId);
  const generations = db.prepare(`SELECT ag.provider, ag.task, ag.status, ag.created_at, c.name channel_name
    FROM ai_generations ag LEFT JOIN channels c ON c.id=ag.channel_id
    WHERE ag.user_id=? OR ag.workspace_id=? ORDER BY ag.id DESC LIMIT 50`).all(userId, workspaceId || 0);
  const thumbnails = db.prepare(`SELECT ma.id, ma.title, ma.file_name, ma.created_at, v.title video_title
    FROM media_assets ma JOIN videos v ON v.id=ma.video_id JOIN channels c ON c.id=v.channel_id
    WHERE c.workspace_id=? AND ma.asset_type='thumbnail' ORDER BY ma.id DESC LIMIT 50`).all(workspaceId || 0);
  const exports = events.filter((e) => e.event_type === "export_package");
  return {
    events: events.map((e) => ({ ...e, metadata: parseJson(e.metadata) })),
    generations,
    thumbnails,
    exports: exports.map((e) => ({ ...e, metadata: parseJson(e.metadata) })),
  };
}

export function changeUserPassword(userId, currentPassword, newPassword, request = null) {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) return { error: "Senha atual incorreta." };
  if (!strongPassword(newPassword)) return { error: "A nova senha precisa ter ao menos 8 caracteres, letra maiúscula, letra minúscula e número." };
  db.prepare("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?").run(hashPassword(newPassword), userId);
  syncDb();
  recordUserEvent({ userId, eventType: "password_changed", request });
  return { ok: true };
}

export function requestAccountDeletion(userId, reason = "", request = null) {
  const db = getDb();
  db.prepare("INSERT INTO delete_account_requests (user_id, reason) VALUES (?,?)").run(userId, reason || null);
  syncDb();
  recordUserEvent({ userId, eventType: "delete_requested", metadata: { reason: reason ? "provided" : "empty" }, request });
  return { ok: true, message: "Solicitação de exclusão registrada." };
}

const hashToken = (token) => createHash("sha256").update(String(token)).digest("hex");

export async function requestPasswordReset({ email, channel = "email", request, origin }) {
  const db = getDb();
  const normalized = String(email || "").toLowerCase().trim();
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(normalized);
  if (user) {
    db.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE user_id=? AND used_at IS NULL").run(user.id);
    const token = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO password_reset_tokens (user_id, token_hash, channel, expires_at, ip, user_agent)
      VALUES (?,?,?,?,?,?)`).run(
      user.id,
      hashToken(token),
      channel,
      expires,
      request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || request?.headers?.get("x-real-ip") || null,
      request?.headers?.get("user-agent") || null
    );
    const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    const delivery = await sendRecoveryMessage({ user, channel, link });
    recordUserEvent({ userId: user.id, eventType: "password_reset_requested", metadata: { channel, delivery }, request });
  }
  syncDb();
  return { ok: true, message: "Se o e-mail estiver cadastrado, enviaremos instruções de recuperação." };
}

export function resetPasswordWithToken(token, password, confirmPassword, request = null) {
  if (password !== confirmPassword) return { error: "A confirmação de senha não confere." };
  if (!strongPassword(password)) return { error: "A nova senha precisa ter ao menos 8 caracteres, letra maiúscula, letra minúscula e número." };
  const db = getDb();
  const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token_hash=? ORDER BY id DESC LIMIT 1").get(hashToken(token));
  if (!row || row.used_at) return { error: "Token inválido ou já utilizado." };
  if (new Date(row.expires_at).getTime() < Date.now()) return { error: "Token expirado. Solicite uma nova recuperação." };
  db.prepare("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?").run(hashPassword(password), row.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE id=?").run(row.id);
  syncDb();
  recordUserEvent({ userId: row.user_id, eventType: "password_reset_completed", request });
  return { ok: true };
}

export async function sendRecoveryMessage({ user, channel, link }) {
  if (channel === "sms" && !process.env.SMS_TOKEN) return { configured: false, message: "Canal SMS ainda não configurado." };
  if (channel === "whatsapp" && !process.env.WHATSAPP_TOKEN) return { configured: false, message: "Canal WhatsApp ainda não configurado." };
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logEvent({ source: "auth.recovery", message: "SMTP não configurado; link de recuperação registrado em modo desenvolvimento.", userId: user.id, context: { link } });
    return { configured: false, message: "SMTP ainda não configurado.", devLink: link };
  }
  logEvent({ source: "auth.recovery", message: "E-mail de recuperação preparado.", userId: user.id, context: { to: user.email, subject: "Recuperação de senha — Canal Engine" } });
  return { configured: true, message: "E-mail de recuperação preparado para envio SMTP." };
}

export function pseudoHashForTests(value) {
  const salt = "test";
  return scryptSync(String(value), salt, 64).toString("hex");
}

function parseJson(value) {
  try { return JSON.parse(value); } catch { return value; }
}

function parseList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value).split(",").map((x) => x.trim()).filter(Boolean);
  }
}
