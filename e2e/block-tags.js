import { test } from "@playwright/test";

/** Keep pixel and accessibility checks on the site, not on tag-manager injections. */
export function blockTags() {
  test.beforeEach(async ({ page }) => {
    await page.route(
      /https?:\/\/([^/]+\.)?(googletagmanager|google-analytics|googletagservices)\.com\//,
      (route) => route.abort(),
    );
  });
}
