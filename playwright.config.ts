import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration.
 *
 * The dev server (`npm run dev`) serves both the API and the Vite-built SPA
 * from the same port (3010), so a single webServer entry covers everything.
 * Run locally with `npm run test:e2e`; CI sets the CI env var automatically.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Where Playwright's own browser download is blocked, point at any Chromium:
        // PW_CHROMIUM_PATH=/path/to/chromium PW_CHROMIUM_ARGS="--no-sandbox" npm run test:e2e
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH, args: (process.env.PW_CHROMIUM_ARGS || '').split(' ').filter(Boolean) }
          : undefined,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3010',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
