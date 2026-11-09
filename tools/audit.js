import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP = new Set([".html", ".css"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function refsIn(text) {
  const refs = new Set();
  for (const match of text.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g)) refs.add(match[1]);
  for (const match of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) refs.add(match[1]);
  return refs;
}

function isExternal(ref) {
  return (
    !ref ||
    ref.startsWith("#") ||
    ref.startsWith("data:") ||
    ref.startsWith("mailto:") ||
    ref.startsWith("tel:") ||
    ref.startsWith("javascript:") ||
    /^[a-z][a-z0-9+.-]*:/i.test(ref) ||
    ref.startsWith("//")
  );
}

export function findBrokenReferences(siteDir) {
  const errors = [];
  const files = walk(siteDir).filter((file) => SKIP.has(path.extname(file)));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const ref of refsIn(text)) {
      if (isExternal(ref)) continue;
      const bare = ref.split("#")[0].split("?")[0];
      if (!bare) continue;
      const fromDir = path.dirname(file);
      const relative = bare.startsWith("/")
        ? bare.slice(1).split("/").filter(Boolean)
        : path.relative(siteDir, fromDir).split(path.sep).concat(bare.split("/")).filter((part) => part && part !== ".");
      const normalized = [];
      for (const part of relative) {
        if (part === "..") normalized.pop();
        else normalized.push(part);
      }
      const target = path.join(siteDir, ...normalized);
      if (!fs.existsSync(target) && !fs.existsSync(path.join(target, "index.html"))) {
        errors.push(`${path.relative(siteDir, file)} -> ${ref}`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = findBrokenReferences(path.resolve("_site"));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Audit passed.");
}
