import {
  assertAllowedMime,
  assertMagic,
  decodePayload,
  extensionForMime,
  hashBytes,
  publicPathFor,
  slugFromAlt,
} from "./assets.js";

function dataUris(text) {
  return text.matchAll(/data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/gi);
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function scriptBodies(html) {
  const bodies = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    bodies.push({ attrs: match[1], body: match[2] });
  }
  return bodies;
}

function attr(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return match ? match[1] ?? match[2] ?? "" : "";
}

function altNear(text, index, length) {
  const after = text.slice(index + length, index + length + 500);
  const before = text.slice(Math.max(0, index - 400), index);
  const patterns = [/alt="([^"]*)"/, /alt:\s*'([^']*)'/, /alt:\s*"([^"]*)"/];
  for (const source of [after, before]) {
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) return decodeEntities(match[1]);
    }
  }
  return "";
}

function collectDataUris(text) {
  const found = [];
  const seen = new Set();
  for (const match of dataUris(text)) {
    const mime = match[1].toLowerCase();
    assertAllowedMime(mime);
    const uri = match[0];
    if (seen.has(uri)) continue;
    seen.add(uri);
    const bytes = decodePayload(match[2], "base64");
    assertMagic(mime, bytes);
    found.push({
      uri,
      mime,
      bytes,
      alt: altNear(text, match.index, match[0].length),
    });
  }
  return found;
}

function assignKeys(records) {
  const byHash = new Map();
  const used = new Set();
  const assets = [];
  const uriToSrc = new Map();
  for (const record of records) {
    const hash = hashBytes(record.bytes);
    const existing = byHash.get(hash);
    if (existing) {
      uriToSrc.set(record.uri, existing.src);
      continue;
    }
    let base = slugFromAlt(record.alt || record.id || "");
    let key = base;
    let n = 2;
    while (used.has(key)) {
      key = `${base}-${n++}`;
    }
    used.add(key);
    const filename = `${key}${extensionForMime(record.mime)}`;
    const src = publicPathFor(record.mime, filename);
    const asset = {
      key,
      filename,
      src,
      mime: record.mime,
      alt: record.alt || "",
      bytes: record.bytes,
      hash,
    };
    byHash.set(hash, asset);
    assets.push(asset);
    if (record.uri) uriToSrc.set(record.uri, src);
  }
  return { assets, uriToSrc };
}

function unpackBundler(html) {
  const scripts = scriptBodies(html);
  const manifestScript = scripts.find((script) => /type\s*=\s*"__bundler\/manifest"/i.test(script.attrs));
  const templateScript = scripts.find((script) => /type\s*=\s*"__bundler\/template"/i.test(script.attrs));
  const orderScript = scripts.find((script) => /type\s*=\s*"__bundler\/page_order"/i.test(script.attrs));
  if (!manifestScript || !templateScript || !orderScript) {
    throw new Error("Design bundle payload is missing");
  }
  let manifest;
  let views;
  try {
    manifest = JSON.parse(manifestScript.body);
  } catch {
    throw new Error("Asset manifest payload is invalid");
  }
  try {
    views = JSON.parse(orderScript.body);
  } catch {
    throw new Error("page_order payload is invalid");
  }
  if (!Array.isArray(views) || views.some((view) => typeof view !== "string" || !view)) {
    throw new Error("page_order payload is invalid");
  }
  const entries = Array.isArray(manifest)
    ? manifest
    : Object.entries(manifest).map(([id, value]) => ({ id, ...value }));
  if (!entries.length) throw new Error("Asset payload is missing");
  const records = entries.map((entry) => {
    if (!entry || !entry.mime || entry.data == null) throw new Error("Asset payload is missing");
    assertAllowedMime(entry.mime);
    const bytes = decodePayload(entry.data, entry.encoding || "base64");
    assertMagic(entry.mime, bytes);
    return { id: entry.id || entry.alt || "", mime: entry.mime, bytes, alt: entry.alt || entry.id || "" };
  });
  const { assets, uriToSrc } = assignKeys(records);
  return {
    format: "bundler",
    views,
    template: templateScript.body.trim(),
    logic: "",
    assets,
    uriToSrc,
  };
}

function unpackDesignComponent(html) {
  const bodyAt = html.lastIndexOf("<body>");
  if (bodyAt < 0) throw new Error("Design bundle payload is missing");
  const open = html.indexOf("<x-dc>", bodyAt);
  const close = html.lastIndexOf("</x-dc>");
  if (open < 0 || close < open) throw new Error("Design bundle payload is missing");
  const template = html.slice(open, close + "</x-dc>".length);
  const scripts = scriptBodies(html.slice(close));
  const logicScript = scripts.find((script) => /type\s*=\s*"text\/x-dc"/i.test(script.attrs));
  const logic = logicScript?.body ?? "";
  const records = [...collectDataUris(template), ...collectDataUris(logic)];
  if (!records.length) throw new Error("Asset payload is missing");
  const { assets, uriToSrc } = assignKeys(records);
  return {
    format: "x-dc",
    views: ["home"],
    template,
    logic,
    assets,
    uriToSrc,
  };
}

export function unpack(html) {
  if (typeof html !== "string" || !html.trim()) throw new Error("Design bundle payload is missing");
  if (html.includes('type="__bundler/manifest"')) return unpackBundler(html);
  if (html.includes("<x-dc>")) return unpackDesignComponent(html);
  throw new Error("Design bundle payload is missing");
}
