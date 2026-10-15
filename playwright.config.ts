import { defineConfig } from '@playwright/test';

// Runs against the production build served by `vite preview`, so the service
// worker and offline mode are tested for real. Locally PW_CHANNEL=msedge uses
// the Edge that ships with Windows; CI installs Chromium.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:4173${base}`,
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: `http://localhost:4173${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
