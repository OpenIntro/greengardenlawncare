import fs from "node:fs";
import path from "node:path";
import { readImageSize } from "./image-size.js";

/** Widths cover phone slots through a full-bleed desktop hero without upscaling past the source. */
export const RESPONSIVE_WIDTHS = [480, 800, 960, 1200, 1600, 1920];

export function variantName(filename, width) {
  const stem = filename.replace(/\.[^.]+$/, "");
  return `${stem}-${width}.webp`;
}

export function variantWidths(sourceWidth) {
  const widths = RESPONSIVE_WIDTHS.filter((width) => width < sourceWidth - 40);
  const cap = Math.min(sourceWidth, 1920);
  if (cap >= 480 && !widths.some((width) => Math.abs(width - cap) < 80)) widths.push(cap);
  return widths.sort((a, b) => a - b);
}

export function loadImageCatalog(imgDir) {
  const catalog = {};
  if (!fs.existsSync(imgDir)) return catalog;
  const responsiveDir = path.join(imgDir, "responsive");
  for (const filename of fs.readdirSync(imgDir)) {
    const file = path.join(imgDir, filename);
    if (!fs.statSync(file).isFile()) continue;
    const buffer = fs.readFileSync(file);
    const size = readImageSize(buffer);
    if (!size) continue;
    const entry = { width: size.width, height: size.height, variants: [] };
    for (const width of variantWidths(size.width)) {
      const variant = variantName(filename, width);
      const variantFile = path.join(responsiveDir, variant);
      if (!fs.existsSync(variantFile)) continue;
      const variantSize = readImageSize(fs.readFileSync(variantFile));
      if (!variantSize) continue;
      entry.variants.push({ file: variant, width: variantSize.width });
    }
    const logo = path.join(responsiveDir, variantName(filename, 128));
    if (filename.includes("logo") && fs.existsSync(logo)) {
      const logoSize = readImageSize(fs.readFileSync(logo));
      if (logoSize) {
        entry.replace = { file: variantName(filename, 128), width: logoSize.width, height: logoSize.height };
      }
    }
    catalog[filename] = entry;
  }
  return catalog;
}

function filenameOf(src) {
  return String(src || "").split("#")[0].split("?")[0].split("/").pop();
}

function directoryOf(src, filename) {
  return String(src).split("#")[0].split("?")[0].replace(filename, "responsive/");
}

function preferredVariant(variants) {
  return [...variants].reverse().find((variant) => variant.width <= 1600) || variants[variants.length - 1];
}

export function describeImage(src, catalog, sizes = "100vw") {
  const filename = filenameOf(src);
  const info = catalog[filename];
  if (!info?.variants?.length) return null;
  const directory = directoryOf(src, filename);
  const preferred = preferredVariant(info.variants);
  return {
    href: `${directory}${preferred.file}`,
    srcset: info.variants.map((variant) => `${directory}${variant.file} ${variant.width}w`).join(", "),
    sizes,
    largest: `${directory}${info.variants[info.variants.length - 1].file}`,
  };
}

/** Hero preload uses the same candidate list as the hero image. */
export function describeMobile(src, catalog) {
  return describeImage(src, catalog, "100vw");
}

export function sizesFor(tag, before) {
  const section = [...before.matchAll(/\sid="(home|services|holiday|work)"/g)].pop()?.[1];
  if (section === "home" || /fetchpriority="high"/i.test(tag)) return "100vw";
  if (section === "work") {
    const column = [...before.matchAll(/grid-column:\s*([^;"]+)/g)].pop()?.[1] || "";
    if (/span\s*4/.test(column)) return "(min-width: 900px) 840px, 100vw";
    return "(min-width: 900px) 420px, 100vw";
  }
  if (section === "holiday") return "(min-width: 900px) 640px, 100vw";
  return "(min-width: 900px) 320px, 100vw";
}

function addAttr(tag, name, value) {
  if (new RegExp(`\\s${name}=`, "i").test(tag)) return tag;
  return tag.replace(/<img\b/i, `<img ${name}="${value}"`);
}

function directoryFor(src, filename) {
  return src.split("#")[0].split("?")[0].replace(filename, "");
}

export function optimizeImageTags(html, catalog = {}) {
  const images = html.replace(/<img\b[^>]*>/gi, (tag, offset) => {
    if (/max-height:\s*78vh/.test(tag)) {
      return addAttr(tag.replace(/\ssrc="[^"]*"/i, ""), "decoding", "async");
    }
    const srcMatch = tag.match(/\ssrc="([^"]+)"/i);
    if (!srcMatch) return tag;
    const src = srcMatch[1];
    const filename = filenameOf(src);
    const info = catalog[filename];
    let next = tag;
    if (info?.replace) {
      next = next.replace(src, `${directoryFor(src, filename)}responsive/${info.replace.file}`);
      next = addAttr(next, "width", info.replace.width);
      next = addAttr(next, "height", info.replace.height);
      return next;
    }
    if (info) {
      next = addAttr(next, "width", info.width);
      next = addAttr(next, "height", info.height);
    }
    if (/\sloading="lazy"/i.test(next)) {
      next = addAttr(next, "decoding", "async");
      next = addAttr(next, "fetchpriority", "low");
    }
    const described = info ? describeImage(src, catalog, sizesFor(tag, html.slice(0, offset))) : null;
    if (!described) return next;
    next = next.replace(src, described.href);
    next = addAttr(next, "srcset", described.srcset);
    next = addAttr(next, "sizes", described.sizes);
    return next;
  });
  return images.replace(/\sdata-src="([^"]+)"/g, (full, src) => {
    const described = describeImage(src, catalog);
    return described ? ` data-src="${described.largest}"` : full;
  });
}
