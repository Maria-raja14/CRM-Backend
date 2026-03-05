


import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, "..");
const UPLOADS_DIR  = path.join(PROJECT_ROOT, "uploads");

const router = express.Router();

// ─────────────────────────────────────────────
// MIME map
// ─────────────────────────────────────────────
const MIME_MAP = {
  ".jpg":  "image/jpeg",  ".jpeg": "image/jpeg",
  ".png":  "image/png",   ".gif":  "image/gif",
  ".webp": "image/webp",  ".svg":  "image/svg+xml",
  ".bmp":  "image/bmp",   ".tiff": "image/tiff",
  ".tif":  "image/tiff",  ".ico":  "image/x-icon",
  ".avif": "image/avif",  ".heic": "image/heic",  ".heif": "image/heif",
  ".pdf":  "application/pdf",
  ".txt":  "text/plain",  ".csv":  "text/csv",
  ".log":  "text/plain",  ".md":   "text/markdown",
  ".json": "application/json", ".xml": "application/xml",
  ".doc":  "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls":  "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt":  "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip":  "application/zip",
};

// ─────────────────────────────────────────────
// resolveFilePath — tries multiple strategies
// Handles all MongoDB path formats:
//   "uploads/leads/file.jpeg"   ← correct
//   "/uploads/leads/file.jpeg"  ← legacy leading slash
//   "leads/file.jpeg"
//   "file.jpeg"
// ─────────────────────────────────────────────
const resolveFilePath = (rawPath) => {
  const stripped = rawPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const basename  = path.basename(stripped);

  const candidates = [
    path.normalize(path.join(PROJECT_ROOT, stripped)),
    path.normalize(path.join(UPLOADS_DIR,  stripped)),
    path.normalize(path.join(UPLOADS_DIR,  "leads", basename)),
    path.normalize(path.join(UPLOADS_DIR,  "deals", basename)),
  ];

  for (const c of candidates) {
    if (!c.startsWith(path.normalize(UPLOADS_DIR))) continue; // security
    if (fs.existsSync(c)) {
      console.log(`✅ [files] "${rawPath}" → "${c}"`);
      return c;
    }
  }

  console.error(`❌ [files] NOT FOUND: "${rawPath}"`);
  candidates.forEach((c) => console.error(`   ${c} → exists:${fs.existsSync(c)}`));
  return null;
};

// ─────────────────────────────────────────────
// GET /api/files/preview
// ─────────────────────────────────────────────
router.get("/preview", protect, (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ message: "filePath is required" });

    const fullPath = resolveFilePath(filePath);
    if (!fullPath) {
      return res.status(404).json({ message: "File not found", path: filePath });
    }

    const ext         = path.extname(fullPath).toLowerCase();
    const fileName    = path.basename(fullPath);
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const stat        = fs.statSync(fullPath);

    console.log(`📤 preview: "${fileName}" | ${contentType} | ${stat.size} bytes`);

    res.writeHead(200, {
      "Content-Type":           contentType,
      "Content-Length":         stat.size,
      "Content-Disposition":    `inline; filename="${encodeURIComponent(fileName)}"`,
      "Accept-Ranges":          "bytes",
      "Cache-Control":          "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });

    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error("❌ preview error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// GET /api/files/download
// ─────────────────────────────────────────────
router.get("/download", protect, (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ message: "filePath is required" });

    const fullPath = resolveFilePath(filePath);
    if (!fullPath) {
      return res.status(404).json({ message: "File not found", path: filePath });
    }

    const ext         = path.extname(fullPath).toLowerCase();
    const fileName    = path.basename(fullPath);
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const stat        = fs.statSync(fullPath);

    console.log(`📥 download: "${fileName}" | ${contentType} | ${stat.size} bytes`);

    res.writeHead(200, {
      "Content-Type":        contentType,
      "Content-Length":      stat.size,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error("❌ download error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// GET /api/files/debug  ← REMOVE IN PRODUCTION
// Usage: GET /api/files/debug?filePath=uploads/leads/xyz.jpeg
// ─────────────────────────────────────────────
router.get("/debug", protect, (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return res.json({ error: "provide ?filePath=" });
  const stripped = filePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const base     = path.basename(stripped);
  res.json({
    input: filePath, PROJECT_ROOT, UPLOADS_DIR,
    candidates: [
      path.join(PROJECT_ROOT, stripped),
      path.join(UPLOADS_DIR, stripped),
      path.join(UPLOADS_DIR, "leads", base),
      path.join(UPLOADS_DIR, "deals", base),
    ].map((p) => ({ path: p, exists: fs.existsSync(p) })),
  });
});

export default router;//original


