import { test, expect, type Page } from '@playwright/test'

/**
 * E2E coverage for the v2 redesign shell.
 *
 * These tests run WITHOUT a backend — CI has no API server, so anything
 * that needs a live `/api/*` response (sending a message, retrieval,
 * streaming, citations) is intentionally out of scope here. They cover
 * the chrome, empty state, theme switching and composer wiring, all of
 * which render purely client-side.
 *
 * The dev server boots with NEXT_PUBLIC_REDESIGN_V2=true (see
 * playwright.config.ts webServer.env) so page.tsx renders <AppShell>.
 */

// page.tsx shows a loading splash until React mounts. On a cold dev
// server the first compile + hydrate can take well over the default
// 5s assertion window — wait for a post-splash element explicitly.
async function waitForAppShell(page: Page) {
  await expect(page.getByRole('textbox', { name: /chat input/i })).toBeVisible(
    { timeout: 30_000 },
  )
}

test.describe('Morpheus shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppShell(page)
  })

  test('renders the header brand', async ({ page }) => {
    await expect(page.getByText('MORPHEUS', { exact: true })).toBeVisible()
    await expect(page.getByText(/AI · Document Intelligence/i)).toBeVisible()
  })

  test('renders the welcome / empty state', async ({ page }) => {
    await expect(page.getByRole('region', { name: /welcome/i })).toBeVisible()
    await expect(
      page.getByText(/I can only show you the door/i),
    ).toBeVisible()
    await expect(page.getByText(/quick prompts/i)).toBeVisible()
  })

  test('composer is focusable via Cmd+K', async ({ page }) => {
    const input = page.getByRole('textbox', { name: /chat input/i })
    await page.keyboard.press('ControlOrMeta+k')
    await expect(input).toBeFocused()
  })

  test('quick prompt fills the composer', async ({ page }) => {
    await page
      .getByRole('button', { name: /what is this document about/i })
      .click()
    await expect(
      page.getByRole('textbox', { name: /chat input/i }),
    ).toHaveValue(/what is this document about/i)
  })

  test('system panel tabs switch', async ({ page }) => {
    const sources = page.getByRole('tab', { name: /sources/i })
    await sources.click()
    await expect(sources).toHaveAttribute('aria-selected', 'true')

    const status = page.getByRole('tab', { name: /status/i })
    await status.click()
    await expect(status).toHaveAttribute('aria-selected', 'true')
  })

  test('settings modal opens and theme toggle switches theme', async ({ page }) => {
    await page
      .getByRole('button', { name: 'Open settings', exact: true })
      .click()

    const dialog = page.getByRole('dialog', { name: /settings/i })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'light', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/light/)

    await dialog.getByRole('button', { name: 'dark', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

test.describe('Mobile shell', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('header and composer render on a phone viewport', async ({ page }) => {
    await page.goto('/')
    await waitForAppShell(page)
    await expect(page.getByText('MORPHEUS', { exact: true })).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('composer and send button expose ARIA labels', async ({ page }) => {
    await page.goto('/')
    await waitForAppShell(page)
    await expect(
      page.getByRole('button', { name: /send message/i }),
    ).toBeVisible()
  })
})
