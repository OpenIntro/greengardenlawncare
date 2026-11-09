import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 30000 },
  use: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: [
    {
      command: "node tools/static-server.js _site 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "node tools/static-server.js . 4174 --index-only",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
