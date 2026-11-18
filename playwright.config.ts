import { defineConfig } from "@playwright/test";

// E2E do Quark. O harness roda num Vite próprio (porta 5180) para não colidir com o dev server do dia a dia.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  outputDir: "e2e/.results",
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5180", acceptDownloads: true, trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx vite --host 127.0.0.1 --port 5180 --strictPort", url: "http://127.0.0.1:5180/e2e/harness/contract-modal.html", reuseExistingServer: false, timeout: 60_000 },
});
