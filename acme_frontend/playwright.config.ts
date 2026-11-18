import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.ACME_E2E_BASE_URL ?? "http://localhost:3001";
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.ACME_CHROMIUM_PATH } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: process.env.ACME_E2E_BASE_URL ? undefined : [
    { command: "pnpm --dir ../acme_backend start", url: "http://localhost:3000/health/ready", timeout: 30_000 },
    { command: "pnpm start", url: baseURL, timeout: 45_000, env: { API_URL: "http://localhost:3000", APP_ORIGIN: baseURL } },
  ],
});
