export function withPrefix(pathPrefix, urlPath) {
  const raw = urlPath || "/";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || (raw.startsWith("//") && raw !== "//")) return raw;
  const prefix =
    !pathPrefix || pathPrefix === "/" ? "" : `/${String(pathPrefix).replace(/^\/+|\/+$/g, "")}`;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const collapsed = `${prefix}${path}`.replace(/\/{2,}/g, "/");
  if (collapsed === "") return "/";
  return collapsed;
}

/** Origin only. A bare hostname is published as https. Paths stay in PATH_PREFIX. */
export function normalizeSiteOrigin(siteUrl) {
  const raw = String(siteUrl || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function canonicalUrl(siteUrl, pathPrefix, pagePath) {
  const path = withPrefix(pathPrefix, pagePath || "/");
  const origin = normalizeSiteOrigin(siteUrl);
  if (!origin) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
