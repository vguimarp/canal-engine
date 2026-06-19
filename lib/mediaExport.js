import fs from "fs";
import path from "path";
import { deflateSync } from "zlib";
import { getDb } from "./db.js";

const MEDIA_DIR = process.env.VERCEL
  ? path.join("/tmp", "canal-engine-media")
  : path.join(process.cwd(), "data", "media");

function ensureDir() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

function safeSlug(text = "video") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "video";
}

function escapeXml(text = "") {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[ch]));
}

function wrapWords(text = "", max = 22, lines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
    if (out.length === lines) break;
  }
  if (line && out.length < lines) out.push(line);
  return out;
}

export function createThumbnailSvg({ title, niche, score = 80, style = "Editorial premium" } = {}) {
  const lines = wrapWords(title || "Canal Engine", 24, 3);
  const subtitle = `${niche || "Conteudo original"} · score ${Math.round(Number(score || 80))}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.55" stop-color="#164e63"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="56" y="56" width="1168" height="608" rx="28" fill="rgba(2,6,23,0.48)" stroke="#f8fafc" stroke-opacity="0.28" stroke-width="3"/>
  <rect x="92" y="96" width="226" height="42" rx="21" fill="#f59e0b"/>
  <text x="205" y="124" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#111827">CAPA IA LOCAL</text>
  <text x="92" y="196" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="900" fill="#ffffff">
    ${lines.map((line, i) => `<tspan x="92" dy="${i === 0 ? 0 : 82}">${escapeXml(line)}</tspan>`).join("")}
  </text>
  <text x="92" y="548" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#fde68a">${escapeXml(subtitle)}</text>
  <text x="92" y="596" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#dbeafe">${escapeXml(style)}</text>
  <circle cx="1090" cy="205" r="86" fill="#f8fafc" fill-opacity="0.13"/>
  <circle cx="1090" cy="205" r="48" fill="#f59e0b"/>
  <path d="M1077 174 L1124 205 L1077 236 Z" fill="#111827"/>
</svg>`;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

export function createThumbnailPng({ title = "", score = 80 } = {}) {
  const width = 1280, height = 720;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const accent = Math.max(60, Math.min(235, Math.round(Number(score || 80) * 2.1)));
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 4;
      const panel = x > 56 && x < 1224 && y > 56 && y < 664;
      const bar = x > 92 && x < 1188 && y > 520 && y < 594;
      const mark = x > 930 && x < 1160 && y > 128 && y < 358;
      raw[i] = panel ? 18 : Math.floor(12 + x / 18);
      raw[i + 1] = bar ? accent : (panel ? 35 : Math.floor(28 + y / 18));
      raw[i + 2] = mark ? 36 : (panel ? 55 : 82);
      raw[i + 3] = 255;
      if ((x + y + title.length) % 97 === 0 && panel) {
        raw[i] = 245; raw[i + 1] = 158; raw[i + 2] = 11;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function writeLocalThumbnailFiles({ videoId, title, niche, score, style }) {
  ensureDir();
  const slug = `${videoId}-${safeSlug(title)}`;
  const svg = createThumbnailSvg({ title, niche, score, style });
  const png = createThumbnailPng({ title, score });
  const svgPath = path.join(MEDIA_DIR, `${slug}.svg`);
  const pngPath = path.join(MEDIA_DIR, `${slug}.png`);
  fs.writeFileSync(svgPath, svg, "utf8");
  fs.writeFileSync(pngPath, png);
  return {
    svg,
    pngBase64: png.toString("base64"),
    svgPath,
    pngPath,
    svgName: path.basename(svgPath),
    pngName: path.basename(pngPath),
  };
}

// Escreve um buffer de mídia (imagem/áudio) em disco e devolve nome/caminho.
export function writeMediaFile({ videoId, kind = "media", ext = "bin", buffer }) {
  ensureDir();
  const name = `${videoId}-${kind}-${Date.now()}.${ext}`;
  const filePath = path.join(MEDIA_DIR, name);
  fs.writeFileSync(filePath, buffer);
  return { fileName: name, filePath };
}

export function getMediaAssetFile(id) {
  const asset = getDb().prepare("SELECT * FROM media_assets WHERE id=?").get(id);
  if (!asset) return null;
  if (asset.file_path && fs.existsSync(asset.file_path)) {
    return {
      asset,
      buffer: fs.readFileSync(asset.file_path),
      mime: asset.asset_mime || "application/octet-stream",
      fileName: asset.file_name || path.basename(asset.file_path),
    };
  }
  if (asset.asset_content) {
    return {
      asset,
      buffer: Buffer.from(asset.asset_content, asset.asset_mime === "image/svg+xml" ? "utf8" : "base64"),
      mime: asset.asset_mime || "application/octet-stream",
      fileName: asset.file_name || `media-${asset.id}`,
    };
  }
  return null;
}

export function buildVideoExportPackage(videoId) {
  const db = getDb();
  const video = db.prepare(`SELECT v.*, c.name channel_name, c.niche
    FROM videos v JOIN channels c ON c.id=v.channel_id
    WHERE v.id=?`).get(videoId);
  if (!video) return null;
  const seo = db.prepare("SELECT * FROM seo_packages WHERE video_id=? ORDER BY id DESC LIMIT 1").get(videoId);
  const assets = db.prepare("SELECT * FROM media_assets WHERE video_id=? ORDER BY id").all(videoId)
    .map((a) => ({ ...a, metadata: parseJson(a.metadata) }));
  const checklist = [
    "Revisar roteiro e inserir experiencia propria",
    "Baixar thumbnail/capa",
    "Conferir titulo, descricao e tags",
    "Publicar primeiro no canal principal",
    "Reaproveitar cortes em Shorts, TikTok, Reels e Kwai",
  ];
  return {
    video: { ...video, hashtags: parseJson(video.hashtags), tags: parseJson(video.tags) },
    seo: seo ? { ...seo, alt_titles: parseJson(seo.alt_titles), tags: parseJson(seo.tags), hashtags: parseJson(seo.hashtags), keywords: parseJson(seo.keywords) } : null,
    media: assets,
    checklist,
  };
}

export function buildVideoExportMarkdown(pack) {
  const tags = pack.video.tags || [];
  const prompts = pack.media.filter((a) => ["image_prompt", "thumbnail", "scene"].includes(a.asset_type));
  return `# ${pack.video.title}

Canal: ${pack.video.channel_name}
Nicho: ${pack.video.niche}

## Descricao
${pack.video.description || pack.seo?.description || ""}

## Tags
${tags.join(", ")}

## Roteiro
${pack.video.script || ""}

## Prompts de imagem
${prompts.map((p) => `- ${p.title || p.asset_type}: ${p.prompt || ""}`).join("\n")}

## SEO
Score: ${pack.seo?.seo_score ?? "pendente"}

## Checklist de publicacao
${pack.checklist.map((i) => `- [ ] ${i}`).join("\n")}
`;
}

function parseJson(value) {
  try { return JSON.parse(value); } catch { return value; }
}
