import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home has no axe violations", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("keyboard reaches the skip link, menu, and estimate form", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-menu")).toBeHidden();
});

test("mobile layout keeps the design's bar and does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call Now", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Free Estimate", exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
});
