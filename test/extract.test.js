import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import { unpack } from "../tools/unpack.js";
import { slugFromAlt } from "../tools/assets.js";

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("slugFromAlt keeps a readable filename", () => {
  assert.equal(
    slugFromAlt("Warm white holiday lights installed along a home's roofline"),
    "warm-white-holiday-lights-installed-along-a-homes-roofline",
  );
});

test("bundler unpack decodes a png and reads page order", () => {
  const html = `<script type="__bundler/manifest">
{"mark":{"mime":"image/png","encoding":"base64","data":"${PNG}","alt":"Logo mark"}}
</script>
<script type="__bundler/template"><section>Home</section></script>
<script type="__bundler/page_order">["home"]</script>`;
  const bundle = unpack(html);
  assert.deepEqual(bundle.views, ["home"]);
  assert.equal(bundle.assets[0].mime, "image/png");
  assert.equal(bundle.assets[0].bytes[0], 0x89);
  assert.equal(bundle.template.includes("Home"), true);
});

test("bundler unpack accepts gzip payloads", () => {
  const raw = Buffer.from(PNG, "base64");
  const gzip = zlib.gzipSync(raw).toString("base64");
  const html = `<script type="__bundler/manifest">
{"mark":{"mime":"image/png","encoding":"gzip","data":"${gzip}","alt":"Logo mark"}}
</script>
<script type="__bundler/template"><section>Home</section></script>
<script type="__bundler/page_order">["home"]</script>`;
  const bundle = unpack(html);
  assert.equal(bundle.assets[0].bytes.equals(raw), true);
});

test("unpack fails on an unmapped mime", () => {
  const html = `<script type="__bundler/manifest">
{"mark":{"mime":"image/gif","data":"${PNG}"}}
</script>
<script type="__bundler/template"><p></p></script>
<script type="__bundler/page_order">["home"]</script>`;
  assert.throws(() => unpack(html), /Unmapped mime type: image\/gif/);
});

test("unpack fails when a payload is missing or invalid", () => {
  const missing = `<script type="__bundler/manifest">{"mark":{"mime":"image/png"}}</script>
<script type="__bundler/template"><p></p></script>
<script type="__bundler/page_order">["home"]</script>`;
  assert.throws(() => unpack(missing), /payload is missing/);
  const invalid = `<script type="__bundler/manifest">{"mark":{"mime":"image/png","data":"aGVsbG8="}}</script>
<script type="__bundler/template"><p></p></script>
<script type="__bundler/page_order">["home"]</script>`;
  assert.throws(() => unpack(invalid), /Invalid image\/png payload/);
});

test("the design bundle is one homepage of jpeg assets", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const bundle = unpack(html);
  assert.deepEqual(bundle.views, ["home"]);
  assert.equal(bundle.format, "x-dc");
  assert.equal(bundle.assets.length, 9);
  assert.ok(bundle.assets.every((asset) => asset.mime === "image/jpeg"));
  assert.ok(bundle.assets.some((asset) => asset.key === "green-garden-lawn-care-logo"));
  assert.ok(bundle.assets.some((asset) => asset.key === "starry-night-two-story-home-with-multicolor-holiday-lights"));
  assert.ok(bundle.assets.some((asset) => asset.key === "neatly-edged-corner-lot-lawn-after-mowing"));
  assert.equal(bundle.template.includes("Beautiful Homes."), true);
});
