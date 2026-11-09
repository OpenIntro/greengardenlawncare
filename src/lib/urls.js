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

export function canonicalUrl(siteUrl, pathPrefix, pagePath) {
  const path = withPrefix(pathPrefix, pagePath || "/");
  const origin = String(siteUrl || "").replace(/\/$/, "");
  if (!origin) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
