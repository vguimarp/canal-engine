import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

let BASE = "";

test("E2E comercial: auth, canal, conteúdo, SEO, distribuição e billing", async (t) => {
  if (!fs.existsSync(".next")) t.skip("Execute npm run build antes do E2E.");
  const port = await freePort();
  BASE = `http://localhost:${port}`;
  let stderr = "";
  const server = spawn("npx", ["next", "start", "-p", String(port)], {
    env: { ...process.env, BILLING_ADMIN_SECRET: "test-admin-secret" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (d) => { stderr += String(d); });
  t.after(() => server.kill("SIGTERM"));
  await waitForServer(stderr);

  const jar = new CookieJar();
  const email = `e2e-${Date.now()}@example.com`;
  let res = await request("/api/auth/signup", { method: "POST", body: { email, name: "E2E", password: "senha123" }, jar });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.plan, "free");

  res = await request("/api/auth/logout", { method: "POST", jar });
  assert.equal(res.status, 200);

  res = await request("/api/auth/login", { method: "POST", body: { email, password: "senha123" }, jar });
  assert.equal(res.status, 200);

  res = await request("/api/billing/subscription", {
    method: "PATCH",
    body: { planCode: "starter" },
    headers: { "x-billing-admin-secret": "test-admin-secret" },
    jar,
  });
  assert.equal(res.status, 200);

  res = await request("/api/channels", { method: "POST", body: { name: "Canal E2E", niche: "IA aplicada" }, jar });
  assert.equal(res.status, 201);
  const channelId = res.body.id;

  res = await request("/api/run-all", { method: "POST", body: { channelId }, jar });
  assert.equal(res.status, 200);
  assert.equal(res.body.ideas, 15);

  res = await request(`/api/ideas?channelId=${channelId}`, { jar });
  assert.equal(res.status, 200);
  const idea = res.body.find((i) => i.format === "long");
  assert.ok(idea?.id);

  res = await request("/api/ideas", { method: "PATCH", body: { id: idea.id, status: "approved" }, jar });
  assert.equal(res.status, 200);

  res = await request("/api/videos", { method: "POST", body: { ideaId: idea.id, channelId }, jar });
  assert.equal(res.status, 201);
  const videoId = res.body.videoId;

  res = await request("/api/seo/generate", { method: "POST", body: { videoId }, jar });
  assert.equal(res.status, 201);

  res = await request("/api/distribution", { method: "POST", body: { videoId }, jar });
  assert.equal(res.status, 201);

  res = await request("/api/billing/checkout", { method: "POST", body: { planCode: "pro", interval: "monthly", provider: "stripe" }, jar });
  assert.equal(res.status, 202);
  assert.equal(res.body.checkoutReady, false);

  res = await request("/api/media-factory", { method: "POST", body: { videoId, channelId }, jar });
  assert.equal(res.status, 201);
  assert.ok(res.body.preview?.id);
  assert.match(res.body.preview.fileName, /\.png$/);

  res = await raw(`/api/media/${res.body.preview.id}?download=1`, { jar });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/png");
  const png = Buffer.from(await res.arrayBuffer());
  assert.equal(png.subarray(1, 4).toString("utf8"), "PNG");

  res = await raw(`/api/export/${videoId}?format=md`, { jar });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Checklist de publicacao/);

  res = await request("/api/billing/subscription", { method: "PATCH", body: { planCode: "free" }, jar });
  assert.equal(res.status, 200);

  res = await request("/api/billing/subscription", { method: "PATCH", body: { action: "cancel" }, jar });
  assert.equal(res.status, 200);
});

async function waitForServer(stderr = "") {
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Servidor E2E não iniciou. ${stderr.slice(0, 500)}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function request(path, { method = "GET", body, headers = {}, jar } = {}) {
  const res = await raw(path, { method, body, headers, jar });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function raw(path, { method = "GET", body, headers = {}, jar } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: jar?.header() || "", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  jar?.store(res.headers.get("set-cookie"));
  return res;
}

class CookieJar {
  constructor() { this.cookies = new Map(); }
  store(header) {
    if (!header) return;
    for (const part of header.split(/,(?=\s*[^;=]+=[^;]+)/)) {
      const [pair] = part.trim().split(";");
      const [k, v] = pair.split("=");
      if (k && v != null) this.cookies.set(k, v);
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}
