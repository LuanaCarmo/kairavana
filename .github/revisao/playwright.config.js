import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.js",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:4173", locale: "pt-BR", timezoneId: "America/Sao_Paulo", trace: "retain-on-failure" },
  webServer: { command: "node servidor.mjs", url: "http://localhost:4173/index.html", reuseExistingServer: true },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "celular-pequeno", use: { ...devices["Pixel 7"], viewport: { width: 320, height: 640 } } }
  ]
});
