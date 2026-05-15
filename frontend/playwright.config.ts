import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 1 : 0,
  /* Single worker everywhere — the suite is small and shares one Next.js
     dev server; parallel workers trigger cold-compile contention and
     flaky timeouts. Serial is deterministic and still fast here. */
  workers: 1,
  /* Per-test timeout — generous enough to absorb the first cold route
     compile, short enough that a genuine hang fails fast. */
  timeout: 60 * 1000,
  /* Hard cap on the whole run so a hang can never burn the CI budget
     (the previous obsolete suite ran 1h20m before failing). */
  globalTimeout: isCI ? 10 * 60 * 1000 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: isCI ? 'github' : 'html',

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Single Chromium project. Mobile coverage is handled inside the spec
     via `test.use({ viewport })` on the Mobile describe — a separate
     mobile *project* would also re-run the desktop-only tests at a phone
     viewport (e.g. the System rail is a closed drawer there) and fail. */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  /* Run the Next.js dev server before starting the tests. The e2e specs
     target the v2 redesign shell, so the dev server must boot with
     NEXT_PUBLIC_REDESIGN_V2=true — otherwise page.tsx renders the legacy
     layout and every v2 selector misses. */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    env: {
      NEXT_PUBLIC_REDESIGN_V2: 'true',
    },
  },
})
