// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Master Test Configuration for BMS Laboratory System
 * Conforms to: AGENT-4-TESTING.md & AGENTS-BACKLOG.md
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 5, // 5 parallel bot instances
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e-report.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

