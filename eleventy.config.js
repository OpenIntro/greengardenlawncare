import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleCss } from "./tools/bundle-css.js";
import { canonicalUrl } from "./src/lib/urls.js";
import { localBusinessJson } from "./src/lib/schema.js";

const root = path.dirname(fileURLToPath(import.meta.url));

function pathPrefixFromEnv() {
  const raw = process.env.PATH_PREFIX || "";
  if (!raw || raw === "/") return "/";
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  return prefixed.replace(/\/$/, "");
}

const pathPrefix = pathPrefixFromEnv();
const siteUrl = process.env.SITE_URL || "";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/api": "api" });
  eleventyConfig.addWatchTarget("index.html");
  eleventyConfig.addWatchTarget("build");
  eleventyConfig.addWatchTarget("src/assets");
  eleventyConfig.addFilter("tf", (value) => (value ? "true" : "false"));
  eleventyConfig.addFilter("share", (urlPath) => canonicalUrl(siteUrl, pathPrefix, urlPath || "/"));
  eleventyConfig.addFilter("jsonLd", (site, canonical) => localBusinessJson(site, canonical));
  eleventyConfig.on("eleventy.after", () => {
    bundleCss({ root, siteUrl, pathPrefix });
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
