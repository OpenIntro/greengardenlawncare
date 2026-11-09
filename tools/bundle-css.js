import fs from "node:fs";
import path from "node:path";
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
  const out = path.join(root, "_site", "assets", "css", "site.css");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, css);
  return { css, canonicalExample: canonicalUrl(siteUrl, pathPrefix, "/") };
}
