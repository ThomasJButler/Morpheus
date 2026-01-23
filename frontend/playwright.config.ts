import { defineConfig, devices } from '@playwright/test'

/**
 * Morpheus Playwright Configuration
 * Includes E2E tests, visual regression tests, and screenshot capture for UX analysis
 */

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }], ['list']],

  /* Global timeout settings */
  timeout: 30000,
  expect: {
    /* Timeout for expect assertions */
    timeout: 10000,
    /* Visual comparison settings */
    toHaveScreenshot: {
      /* Maximum allowed pixel difference */
      maxDiffPixels: 100,
      /* Threshold for color difference (0-1) */
      threshold: 0.2,
      /* Animation handling */
      animations: 'disabled',
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.05,
    },
  },

  /* Snapshot configuration */
  snapshotDir: './e2e/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}-{projectName}{ext}',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Consistent viewport for visual tests */
    viewport: { width: 1280, height: 720 },

    /* Disable animations for consistent screenshots */
    launchOptions: {
      args: ['--force-prefers-reduced-motion'],
    },
  },

  /* Configure projects for major browsers and viewports */
  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Visual regression test projects - specific viewports */
    {
      name: 'visual-desktop',
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'visual-tablet',
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 834, height: 1194 },
      },
    },
    {
      name: 'visual-mobile',
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },

    /* Screenshot capture project - for UX analysis */
    {
      name: 'screenshot-capture',
      testMatch: /capture-screenshots\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
