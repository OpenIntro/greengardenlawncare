import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";
import { canonicalUrl } from "../src/lib/urls.js";

export function bundleCss({ root, siteUrl = "", pathPrefix = "/" }) {
  const files = [
    "src/assets/css/local-fonts.css",
    "src/assets/css/fonts.css",
    "build/css/base.css",
    "build/css/hover.css",
    "src/assets/css/enhancements.css",
  ];
  let css = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  const prefix = !pathPrefix || pathPrefix === "/" ? "" : pathPrefix.replace(/\/$/, "");
  if (prefix) {
    css = css.replaceAll("url(/assets/", `url(${prefix}/assets/`);
    css = css.replaceAll('url("/assets/', `url("${prefix}/assets/`);
  }
  css = esbuild.transformSync(css, { loader: "css", minify: true, legalComments: "none" }).code;
  const outDir = path.join(root, "_site", "assets", "css");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "site.css"), css);
  for (const file of ["local-fonts.css", "fonts.css", "enhancements.css"]) {
    fs.rmSync(path.join(outDir, file), { force: true });
  }
  return { css, canonicalExample: canonicalUrl(siteUrl, pathPrefix, "/") };
}
