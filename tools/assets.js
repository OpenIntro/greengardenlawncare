import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";

export const ALLOWED_MIMES = new Set(["image/webp", "image/jpeg", "image/png", "font/woff2"]);

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "font/woff2": ".woff2",
};

export function assertAllowedMime(mime) {
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error(`Unmapped mime type: ${mime}`);
  }
}

export function extensionForMime(mime) {
  assertAllowedMime(mime);
  return EXTENSIONS[mime];
}

export function slugFromAlt(alt) {
  const slug = String(alt || "")
    .replace(/&amp;/g, " and ")
    .replace(/['’]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
  return slug || "image";
}

export function decodePayload(data, encoding = "base64") {
  if (data == null || String(data).trim() === "") {
    throw new Error("Asset payload is missing");
  }
  const compact = String(data).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact) || compact.length % 4 === 1) {
    throw new Error("Asset payload is not valid base64");
  }
  let bytes = Buffer.from(compact, "base64");
  if (!bytes.length) throw new Error("Asset payload is invalid");
  if (encoding === "gzip") {
    try {
      bytes = gunzipSync(bytes);
    } catch {
      throw new Error("Asset payload is invalid gzip");
    }
  } else if (encoding !== "base64") {
    throw new Error(`Unknown asset encoding: ${encoding}`);
  }
  if (!bytes.length) throw new Error("Asset payload is invalid");
  return bytes;
}

export function assertMagic(mime, bytes) {
  const ok =
    (mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mime === "image/png" &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47) ||
    (mime === "image/webp" &&
      bytes.length > 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") ||
    (mime === "font/woff2" && bytes.toString("ascii", 0, 4) === "wOF2");
  if (!ok) throw new Error(`Invalid ${mime} payload`);
}

export function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function publicPathFor(mime, filename) {
  const folder = mime === "font/woff2" ? "fonts" : "img";
  return `/assets/${folder}/${filename}`;
}
