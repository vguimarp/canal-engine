// ============================================================
// Multi-tenant (FASE 3) — resolve a workspace do contexto atual.
//  • Logado  → workspace do usuário.
//  • Anônimo → workspace demo (preserva os 5 canais públicos).
// Aditivo e não-destrutivo: sem sessão, nada muda no comportamento atual.
// ============================================================

import { getDb, syncDb } from "./db.js";
import { getSession } from "./session.js";

export function demoWorkspaceId() {
  const w = getDb().prepare("SELECT id FROM workspaces WHERE is_demo=1 ORDER BY id LIMIT 1").get();
  return w?.id ?? null;
}

// Workspace efetiva da requisição (lê o cookie de sessão).
export function currentWorkspaceId() {
  const s = getSession();
  if (s?.uid) {
    const db = getDb();
    const u = db.prepare("SELECT id, email, name, workspace_id FROM users WHERE id=?").get(s.uid);
    if (u?.workspace_id) return u.workspace_id;
    if (u?.id) {
      const ws = db.prepare("INSERT INTO workspaces (name, owner_user_id, is_demo) VALUES (?,?,0)")
        .run(`${u.name || u.email || "Usuário"} — Workspace`, u.id);
      db.prepare("UPDATE users SET workspace_id=? WHERE id=?").run(ws.lastInsertRowid, u.id);
      syncDb();
      return ws.lastInsertRowid;
    }
  }
  return demoWorkspaceId();
}

export function currentUserId() {
  return getSession()?.uid ?? null;
}

export function workspaceChannels(workspaceId = currentWorkspaceId()) {
  if (workspaceId == null) return [];
  return getDb().prepare("SELECT * FROM channels WHERE workspace_id=? ORDER BY id").all(workspaceId);
}

export function firstChannelId(workspaceId = currentWorkspaceId()) {
  if (workspaceId == null) return null;
  const row = getDb().prepare("SELECT id FROM channels WHERE workspace_id=? ORDER BY id LIMIT 1").get(workspaceId);
  return row?.id ?? null;
}

export function channelBelongsToWorkspace(channelId, workspaceId = currentWorkspaceId()) {
  if (!channelId || workspaceId == null) return false;
  const row = getDb().prepare("SELECT workspace_id FROM channels WHERE id=?").get(Number(channelId));
  return !!row && row.workspace_id === workspaceId;
}

export function resolveChannelId(request, { required = false } = {}) {
  const sp = request ? new URL(request.url).searchParams : new URLSearchParams();
  const workspaceId = currentWorkspaceId();
  const requested = Number(sp.get("channelId") || sp.get("channel") || 0);
  if (requested && channelBelongsToWorkspace(requested, workspaceId)) return { channelId: requested, workspaceId };
  if (requested && required) return { error: "Canal não encontrado nesta workspace.", status: 404, workspaceId };
  const fallback = firstChannelId(workspaceId);
  if (fallback) return { channelId: fallback, workspaceId };
  return { error: "Nenhum canal disponível nesta workspace.", status: 404, workspaceId };
}

export function resolveBodyChannel(body = {}, { required = false } = {}) {
  const workspaceId = currentWorkspaceId();
  const requested = Number(body.channelId || body.channel || 0);
  if (requested && channelBelongsToWorkspace(requested, workspaceId)) return { channelId: requested, workspaceId };
  if (requested && required) return { error: "Canal não encontrado nesta workspace.", status: 404, workspaceId };
  const fallback = firstChannelId(workspaceId);
  if (fallback) return { channelId: fallback, workspaceId };
  return { error: "Nenhum canal disponível nesta workspace.", status: 404, workspaceId };
}

// Verifica se a workspace atual é dona de um canal (permissão básica de escrita).
export function ownsChannel(channelId) {
  return channelBelongsToWorkspace(channelId);
}

export function videoBelongsToWorkspace(videoId, workspaceId = currentWorkspaceId()) {
  if (!videoId || workspaceId == null) return false;
  const row = getDb().prepare(`
    SELECT c.workspace_id FROM videos v
    JOIN channels c ON c.id=v.channel_id
    WHERE v.id=?`).get(Number(videoId));
  return !!row && row.workspace_id === workspaceId;
}

export function ideaBelongsToWorkspace(ideaId, workspaceId = currentWorkspaceId()) {
  if (!ideaId || workspaceId == null) return false;
  const row = getDb().prepare(`
    SELECT c.workspace_id FROM ideas i
    JOIN channels c ON c.id=i.channel_id
    WHERE i.id=?`).get(Number(ideaId));
  return !!row && row.workspace_id === workspaceId;
}

export function distributionBelongsToWorkspace(id, workspaceId = currentWorkspaceId()) {
  if (!id || workspaceId == null) return false;
  const row = getDb().prepare(`
    SELECT c.workspace_id FROM distributions d
    JOIN channels c ON c.id=d.channel_id
    WHERE d.id=?`).get(Number(id));
  return !!row && row.workspace_id === workspaceId;
}
