import { defineConfig, devices } from "@playwright/test";

// End-to-end run against the built app on the keyless PGlite demo path, the
// same setup the smoke test uses: no Supabase project, no model key. Run with
// `npm run test:e2e` after `npm run build`. Files end in .e2e.ts so vitest
// never collects them.
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@phone/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
  ],
  webServer: {
    command: "npm start",
    cwd: "..",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
