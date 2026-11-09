import test from "node:test";
import assert from "node:assert/strict";
import { heroFor, galleryLayout, phoneLabel, resolveSeason } from "../src/lib/season.js";
import { buildHomeData } from "../src/lib/home-data.js";
import { bindSiteFacts } from "../tools/bind-facts.js";
import fs from "node:fs";
import site from "../src/_data/site.js";

test("season resolves only to the two design states", () => {
  assert.equal(resolveSeason(undefined), "holiday");
  assert.equal(resolveSeason(""), "holiday");
  assert.equal(resolveSeason("nope"), "holiday");
  assert.equal(resolveSeason("standard"), "standard");
  assert.equal(resolveSeason("holiday"), "holiday");
  assert.equal(resolveSeason("nope", "standard"), "standard");
});

test("site facts keep the design phone and leave unknown facts empty", () => {
  assert.equal(site.name, "Green Garden Lawn Care");
  assert.equal(site.phone, "214-962-9089");
  assert.equal(site.phoneHref, "tel:2149629089");
  assert.equal(site.email, null);
  assert.equal(site.hours, null);
  assert.equal(site.address, null);
  const source = fs.readFileSync(new URL("../src/_data/site.js", import.meta.url), "utf8");
  const configuredSeason = source.match(/const configuredSeason = "(holiday|standard)"/)[1];
  assert.equal(site.season, resolveSeason(process.env.SEASON, configuredSeason));
});

test("hero copy follows the season switch", () => {
  const holiday = heroFor("holiday", site.name);
  const standard = heroFor("standard", site.name);
  assert.equal(holiday.heroNote, "Now Booking Holiday Light Installations");
  assert.equal(holiday.heroSecondaryHref, "#holiday");
  assert.equal(standard.heroNote, "Now Scheduling Weekly Lawn Service");
  assert.equal(standard.heroSecondaryLabel, "Explore Lawn Care");
  assert.equal(phoneLabel(site.phone, false), "Call 214-962-9089");
  assert.equal(phoneLabel(site.phone, true), "Call");
});

test("gallery spans match the desktop design", () => {
  assert.deepEqual(galleryLayout(0, false), { col: "1 / span 4", ratio: "auto", minH: "560px" });
  assert.deepEqual(galleryLayout(1, false), { col: "5 / span 2", ratio: "auto", minH: "272px" });
  assert.deepEqual(galleryLayout(4, false), { col: "span 2", ratio: "4 / 3", minH: "auto" });
  assert.equal(galleryLayout(0, true).col, "1 / -1");
});

test("homepage data uses the season image and does not invent contact facts", () => {
  const assets = {
    "two-story-north-texas-home-outlined-in-multicolor-holiday-lights": { src: "/assets/img/holiday.jpg" },
    "freshly-mowed-lawn-with-clean-edges-in-front-of-a-brick-home": { src: "/assets/img/lawn.jpg" },
    "warm-white-holiday-lights-installed-along-a-homes-roofline": { src: "/a.jpg" },
    "neatly-rounded-shrubs-in-a-mulched-bed-beside-a-front-porch": { src: "/b.jpg" },
    "flower-bed-refreshed-with-new-red-mulch-along-a-porch": { src: "/c.jpg" },
    "stone-front-two-story-home-with-multicolor-holiday-lights-framing-every-window-and-gable": { src: "/d.jpg" },
    "neatly-edged-corner-lot-lawn-after-mowing": { src: "/e.jpg" },
  };
  const holiday = buildHomeData({ ...site, season: "holiday" }, assets);
  const standard = buildHomeData({ ...site, season: "standard" }, assets);
  assert.equal(holiday.heroImage, "/assets/img/holiday.jpg");
  assert.equal(standard.heroImage, "/assets/img/lawn.jpg");
  assert.equal(holiday.galleryItems.length, 7);
  assert.equal(holiday.galleryItems[0].col, "1 / span 4");
});

test("design literals bind to site data and do not invent an address", () => {
  const html = 'Green Garden<br><span>Lawn Care</span> <a href="tel:2149629089">214-962-9089</a> Chris Rivera calls Chris in North Texas. Green Garden Lawn Care';
  const bound = bindSiteFacts(html);
  assert.match(bound, /\{\{ site\.wordmarkPrimary \}\}<br><span>\{\{ site\.wordmarkSecondary \}\}<\/span>/);
  assert.match(bound, /href="\{\{ site\.phoneHref \}\}"/);
  assert.match(bound, /\{\{ site\.phone \}\}/);
  assert.match(bound, /\{\{ site\.contactName \}\}/);
  assert.match(bound, /\{\{ site\.contactShort \}\}/);
  assert.match(bound, /\{\{ site\.areaServed \}\}/);
  assert.match(bound, /\{\{ site\.name \}\}/);
  assert.doesNotMatch(bound, /123 Main|hours|@example/);
});
