import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleCss } from "../tools/bundle-css.js";
import { bundleJs } from "../tools/bundle-js.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("published css is one minified stylesheet", () => {
  const prefixed = bundleCss({ root, pathPrefix: "/lawn" });
  assert.match(prefixed.css, /\/lawn\/assets\/fonts\/dm-serif-display-latin\.woff2/);
  const published = bundleCss({ root });
  assert.match(published.css, /url\(\/assets\/fonts\/dm-serif-display-latin\.woff2\)/);
  assert.match(published.css, /url\(\/assets\/fonts\/manrope-latin\.woff2\)/);
  assert.match(published.css, /font-weight:500/);
  assert.match(published.css, /font-weight:700/);
  assert.doesNotMatch(published.css, /\/\*/);
  assert.doesNotMatch(published.css, /\/lawn\//);
  for (const file of ["local-fonts.css", "fonts.css", "enhancements.css"]) {
    assert.equal(fs.existsSync(path.join(root, "_site", "assets", "css", file)), false);
  }
});

test("published javascript is one minified module", () => {
  const { js } = bundleJs({ root });
  assert.doesNotMatch(js, /estimate-outcome/);
  assert.match(js, /Please enter your name/);
  assert.ok(js.length < fs.readFileSync(path.join(root, "src", "assets", "js", "home.js"), "utf8").length);
  assert.equal(fs.existsSync(path.join(root, "_site", "assets", "js", "estimate-outcome.js")), false);
});
