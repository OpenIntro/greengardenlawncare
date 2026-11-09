import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { bundleCss } from "./tools/bundle-css.js";
import { stampEstimateRecipient } from "./tools/estimate-mail.js";
import { canonicalUrl, normalizeSiteOrigin } from "./src/lib/urls.js";
import { localBusinessJson } from "./src/lib/schema.js";
import { readImageSize } from "./src/lib/image-size.js";

dotenv.config();

const root = path.dirname(fileURLToPath(import.meta.url));

function pathPrefixFromEnv() {
  const raw = process.env.PATH_PREFIX || "";
  if (!raw || raw === "/") return "/";
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  return prefixed.replace(/\/$/, "");
}

const pathPrefix = pathPrefixFromEnv();
const siteUrl = normalizeSiteOrigin(process.env.SITE_URL || "");

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/api": "api" });
  eleventyConfig.addWatchTarget("index.html");
  eleventyConfig.addWatchTarget("build");
  eleventyConfig.addWatchTarget("src/assets");
  eleventyConfig.addFilter("tf", (value) => (value ? "true" : "false"));
  eleventyConfig.addFilter("share", (urlPath) => canonicalUrl(siteUrl, pathPrefix, urlPath || "/"));
  eleventyConfig.addFilter("imageMeta", (urlPath) => {
    const relative = String(urlPath || "").split("?")[0].split("#")[0].replace(/^\/+/, "");
    if (!relative || relative.split("/").includes("..")) return {};
    const file = path.join(root, "src", relative);
    if (!file.startsWith(path.join(root, "src") + path.sep) || !fs.existsSync(file)) return {};
    return readImageSize(fs.readFileSync(file)) || {};
  });
  eleventyConfig.addFilter("jsonLd", (site, canonical, image, title, description, logo) =>
    localBusinessJson(site, canonical, { image, title, description, logo }),
  );
  eleventyConfig.on("eleventy.after", () => {
    bundleCss({ root, siteUrl, pathPrefix });
    const phpPath = path.join(root, "_site", "api", "estimate.php");
    const recipient = process.env.ESTIMATE_TO || "";
    if (!fs.existsSync(phpPath)) return;
    if (!recipient.trim()) {
      console.warn("ESTIMATE_TO is empty. The estimate form will not send mail until it is set and the site is rebuilt.");
      return;
    }
    fs.writeFileSync(phpPath, stampEstimateRecipient(fs.readFileSync(phpPath, "utf8"), recipient));
  });

  return {
    pathPrefix,
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: false,
    dir: {
      input: "src/pages",
      includes: "../_includes",
      data: "../_data",
      output: "_site",
    },
  };
}
