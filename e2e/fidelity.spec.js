import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const MAX_DIFF_RATIO = 0.001;
/** Per-view caps. Leave empty unless a view has an approved pending-content treatment. */
const VIEW_DIFF_CAPS = {};

async function arm(page) {
  await page.addInitScript(() => {
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if ((type === "scroll" || type === "resize") && this === window) {
        const wrapped = function (...args) {
          if (window.__holdViewport) return undefined;
          return listener.apply(this, args);
        };
        return original.call(this, type, wrapped, options);
      }
      return original.call(this, type, listener, options);
    };
  });
}

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const step = Math.max(240, window.innerHeight - 80);
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    document.querySelectorAll("[data-reveal]").forEach((element) => element.setAttribute("data-in", "1"));
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => {
    const header = document.querySelector("header");
    const background = getComputedStyle(header).backgroundColor;
    return background.includes("8, 30, 20") || background.includes("8,30,20");
  });
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((image) => (image.complete ? Promise.resolve() : image.decode().catch(() => {}))),
    );
  });
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}",
  });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.__holdViewport = true;
  });
}

test("home matches the design bundle", async ({ page, browser }) => {
  const view = "home";
  const cap = VIEW_DIFF_CAPS[view] ?? MAX_DIFF_RATIO;
  await arm(page);
  await page.goto("http://127.0.0.1:4173/");
  const season = await page.locator("body").getAttribute("data-season");

  const original = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await arm(original);
  await original.goto("http://127.0.0.1:4174/");
  await original.waitForFunction(() => window.__dcRootName && document.querySelector("h1"));
  await original.evaluate((nextSeason) => {
    window.__dcSetProps(window.__dcRootName(), { season: nextSeason });
  }, season);
  await original.waitForFunction((nextSeason) => {
    const text = document.body.innerText;
    return nextSeason === "standard"
      ? text.includes("Now Scheduling Weekly Lawn Service")
      : text.includes("Now Booking Holiday Light Installations");
  }, season);

  await settle(page);
  await settle(original);

  const builtShot = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
  const originalShot = await original.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
  await original.close();

  const built = PNG.sync.read(builtShot);
  const source = PNG.sync.read(originalShot);
  const dir = path.resolve("e2e/screenshots");
  const fail = (message) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${view}-built.png`), builtShot);
    fs.writeFileSync(path.join(dir, `${view}-original.png`), originalShot);
    throw new Error(message);
  };
  if (built.width !== source.width || built.height !== source.height) {
    fail(`home screenshots differ in size: built ${built.width}x${built.height}, original ${source.width}x${source.height}`);
  }
  const diff = new PNG({ width: built.width, height: built.height });
  const mismatched = pixelmatch(source.data, built.data, diff.data, built.width, built.height, {
    threshold: 0.1,
  });
  const ratio = mismatched / (built.width * built.height);
  if (ratio > cap) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${view}-built.png`), PNG.sync.write(built));
    fs.writeFileSync(path.join(dir, `${view}-original.png`), PNG.sync.write(source));
    fs.writeFileSync(path.join(dir, `${view}-diff.png`), PNG.sync.write(diff));
    expect(ratio, `${view} diff ratio ${ratio} exceeds ${cap}`).toBeLessThanOrEqual(cap);
  }
});
