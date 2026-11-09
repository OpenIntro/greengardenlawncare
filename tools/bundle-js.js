import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";

export function bundleJs({ root }) {
  const outDir = path.join(root, "_site", "assets", "js");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, "home.js");
  esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: ["src/assets/js/home.js"],
    bundle: true,
    minify: true,
    format: "esm",
    target: "es2022",
    legalComments: "none",
    outfile,
  });
  fs.rmSync(path.join(outDir, "estimate-outcome.js"), { force: true });
  const js = fs.readFileSync(outfile, "utf8");
  return { js };
}
