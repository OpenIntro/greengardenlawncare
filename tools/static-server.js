import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [dirArg, portArg, mode] = process.argv.slice(2);
const root = path.resolve(dirArg || ".");
const port = Number(portArg || 8080);
const indexOnly = mode === "--index-only";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".php": "text/plain; charset=utf-8",
};

function inside(parent, file) {
  const relative = path.relative(parent, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (indexOnly && pathname !== "/" && pathname !== "/index.html") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(root, `.${pathname}`);
  if (!inside(root, file)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      sendMissing(res, req);
      return;
    }
    const type = types[path.extname(file)] || "application/octet-stream";
    send(req, res, 200, type, data);
  });
});

const COMPRESSIBLE = /^(text\/|application\/(?:javascript|json|xml))/;

function send(req, res, status, type, data) {
  const headers = { "Content-Type": type, "Cache-Control": "no-store", Vary: "Accept-Encoding" };
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const accept = String(req.headers["accept-encoding"] || "");
  if (COMPRESSIBLE.test(type) && body.length > 256) {
    if (/\bbr\b/.test(accept)) {
      headers["Content-Encoding"] = "br";
      res.writeHead(status, headers);
      res.end(zlib.brotliCompressSync(body));
      return;
    }
    if (/\bgzip\b/.test(accept)) {
      headers["Content-Encoding"] = "gzip";
      res.writeHead(status, headers);
      res.end(zlib.gzipSync(body));
      return;
    }
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendMissing(res, req) {
  if (indexOnly) {
    send(req, res, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }
  fs.readFile(path.join(root, "404.html"), (error, data) => {
    if (error) {
      send(req, res, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }
    send(req, res, 404, "text/html; charset=utf-8", data);
  });
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
