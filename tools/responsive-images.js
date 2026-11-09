import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readImageSize } from "../src/lib/image-size.js";
import { variantName, variantWidths } from "../src/lib/responsive-markup.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function magickAvailable() {
  const result = spawnSync("magick", ["-version"], { encoding: "utf8" });
  return result.status === 0;
}

function magick(args) {
  const result = spawnSync("magick", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `magick failed: ${args.join(" ")}`);
  }
}

function newer(output, input) {
  if (!fs.existsSync(output)) return false;
  return fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs;
}

function qualityFor(width) {
  if (width >= 1600) return 80;
  if (width >= 1200) return 76;
  return 72;
}

function writeVariant(input, output, width, quality) {
  if (newer(output, input)) return false;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const resize = width >= readImageSize(fs.readFileSync(input)).width ? [] : ["-resize", `${width}x`];
  magick([input, ...resize, "-strip", "-quality", String(quality), "-define", "webp:method=6", output]);
  return true;
}

export function generateResponsiveImages({ root = projectRoot } = {}) {
  const imgDir = path.join(root, "src", "assets", "img");
  const responsiveDir = path.join(imgDir, "responsive");
  const favicon = path.join(root, "src", "assets", "favicon.png");
  const outputs = [
    [path.join(root, "src", "assets", "favicon-32.png"), ["-resize", "32x32"]],
    [path.join(root, "src", "assets", "apple-touch-icon.png"), ["-resize", "180x180"]],
  ];
  if (!magickAvailable()) {
    const ready = fs.existsSync(responsiveDir) && fs.readdirSync(responsiveDir).some((file) => file.endsWith(".webp"));
    if (!ready) console.warn("ImageMagick is not available, so responsive image variants were not generated.");
    return { generated: 0, skipped: true };
  }
  let generated = 0;
  if (fs.existsSync(favicon)) {
    for (const [output, args] of outputs) {
      if (newer(output, favicon)) continue;
      magick([favicon, ...args, output]);
      generated += 1;
    }
  }
  if (!fs.existsSync(imgDir)) return { generated, skipped: false };
  fs.mkdirSync(responsiveDir, { recursive: true });
  const expected = new Set();
  for (const filename of fs.readdirSync(imgDir)) {
    const input = path.join(imgDir, filename);
    if (!fs.statSync(input).isFile()) continue;
    const size = readImageSize(fs.readFileSync(input));
    if (!size) continue;
    if (filename.includes("logo")) {
      const name = variantName(filename, 128);
      expected.add(name);
      if (writeVariant(input, path.join(responsiveDir, name), 128, 80)) generated += 1;
      continue;
    }
    for (const width of variantWidths(size.width)) {
      const name = variantName(filename, width);
      expected.add(name);
      if (writeVariant(input, path.join(responsiveDir, name), width, qualityFor(width))) generated += 1;
    }
  }
  for (const file of fs.readdirSync(responsiveDir)) {
    if (!expected.has(file)) fs.unlinkSync(path.join(responsiveDir, file));
  }
  return { generated, skipped: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateResponsiveImages();
  console.log(result.skipped ? "Responsive images skipped." : `Responsive images generated: ${result.generated}.`);
}
