const BLOCKED_ROOTS = new Set([
  "/",
  "/bin",
  "/boot",
  "/dev",
  "/etc",
  "/home",
  "/opt",
  "/private",
  "/public_html",
  "/root",
  "/srv",
  "/tmp",
  "/usr",
  "/var",
  "/var/www",
  "/www",
  "/httpdocs",
]);

export function normalizeRemoteRoot(remoteRoot) {
  const root = `/${String(remoteRoot || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")}`;
  return root === "/" ? "/" : root.replace(/\/{2,}/g, "/");
}

export function assertDeleteAllowed(remoteRoot, identityText) {
  const root = normalizeRemoteRoot(remoteRoot);
  if (!String(remoteRoot || "").startsWith("/")) {
    throw new Error("Refusing --delete: remote directory must be an absolute document root");
  }
  const parts = root.split("/").filter(Boolean);
  if (parts.length < 2 || BLOCKED_ROOTS.has(root)) {
    throw new Error("Refusing --delete: remote directory is not this site's document root");
  }
  if (String(identityText || "").trim() !== "Green Garden Lawn Care") {
    throw new Error("Refusing --delete: remote directory is missing this site's identity file");
  }
  return root;
}

export function shouldSkipRemote(relativePath) {
  const parts = String(relativePath || "").split(/[\\/]/).filter(Boolean);
  return parts.includes(".well-known") || parts.includes("cgi-bin");
}
