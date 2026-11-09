import test from "node:test";
import assert from "node:assert/strict";
import { describeMobile, optimizeImageTags, variantWidths } from "../src/lib/responsive-markup.js";

const catalog = {
  "hero.webp": {
    width: 2892,
    height: 2174,
    variants: [
      { file: "hero-480.webp", width: 480 },
      { file: "hero-800.webp", width: 800 },
      { file: "hero-960.webp", width: 960 },
      { file: "hero-1200.webp", width: 1200 },
      { file: "hero-1600.webp", width: 1600 },
      { file: "hero-1920.webp", width: 1920 },
    ],
  },
  "lawn.jpg": {
    width: 1400,
    height: 1050,
    variants: [
      { file: "lawn-480.webp", width: 480 },
      { file: "lawn-800.webp", width: 800 },
      { file: "lawn-960.webp", width: 960 },
      { file: "lawn-1200.webp", width: 1200 },
      { file: "lawn-1400.webp", width: 1400 },
    ],
  },
  "green-garden-lawn-care-logo.jpg": {
    width: 504,
    height: 498,
    variants: [],
    replace: { file: "green-garden-lawn-care-logo-128.webp", width: 128, height: 126 },
  },
};

test("variant widths stay within the source and cover desktop slots", () => {
  assert.deepEqual(variantWidths(2892), [480, 800, 960, 1200, 1600, 1920]);
  assert.deepEqual(variantWidths(1400), [480, 800, 960, 1200, 1400]);
});

test("hero preload lists every desktop and mobile candidate", () => {
  const described = describeMobile("/assets/img/hero.webp", catalog);
  assert.equal(described.href, "/assets/img/responsive/hero-1600.webp");
  assert.match(described.srcset, /hero-480\.webp 480w/);
  assert.match(described.srcset, /hero-1920\.webp 1920w/);
  assert.equal(described.sizes, "100vw");
  assert.equal(describeMobile("/assets/img/missing.jpg", catalog), null);
});

test("each placement gets a srcset sized for its desktop slot", () => {
  const html = [
    '<section id="home"><img src="/assets/img/hero.webp" fetchpriority="high" alt="Hero" style="position:absolute;inset:0;width:100%;height:100%"></section>',
    '<section id="services"><img src="/assets/img/lawn.jpg" alt="Lawn" loading="lazy" style="width:100%;height:100%"></section>',
    '<section id="work"><button style="grid-column:1 / span 4" data-src="/assets/img/lawn.jpg"><img src="/assets/img/lawn.jpg" alt="Big" loading="lazy" style="position:absolute"></button></section>',
    '<img src="/assets/img/green-garden-lawn-care-logo.jpg" alt="Logo" style="height:52px;width:52px">',
    '<img src="/assets/img/lawn.jpg" alt="Large" style="max-height:78vh">',
  ].join("");
  const result = optimizeImageTags(html, catalog);
  assert.match(result, /src="\/assets\/img\/responsive\/hero-1600\.webp"/);
  assert.match(result, /sizes="100vw"/);
  assert.match(result, /hero-1920\.webp 1920w/);
  assert.doesNotMatch(result, /src="\/assets\/img\/hero\.webp"/);
  assert.match(result, /sizes="\(min-width: 900px\) 320px, 100vw"/);
  assert.match(result, /sizes="\(min-width: 900px\) 840px, 100vw"/);
  assert.match(result, /data-src="\/assets\/img\/responsive\/lawn-1400\.webp"/);
  assert.match(result, /src="\/assets\/img\/responsive\/green-garden-lawn-care-logo-128\.webp"/);
  assert.doesNotMatch(result, /<picture\b/);
  assert.match(result, /<img decoding="async" alt="Large" style="max-height:78vh">/);
});
