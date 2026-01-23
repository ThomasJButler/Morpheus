/**
 * Screenshot Capture for UX Analysis
 *
 * This test captures screenshots of various UI states for the UX planning phase.
 * Run with: npm run screenshots:capture
 *
 * Screenshots are saved to frontend/screenshots/ for analysis.
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const screenshotDir = path.join(__dirname, '..', 'screenshots')

// Helper to capture with consistent settings
async function captureScreenshot(
  page: any,
  name: string,
  options: { fullPage?: boolean; clip?: any } = {}
) {
  const filename = `${name}-${new Date().toISOString().split('T')[0]}.png`
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: options.fullPage ?? false,
    ...options,
  })
  console.log(`  📸 Captured: ${filename}`)
}

test.describe('UX Screenshot Capture', () => {
  test.beforeEach(async ({ page }) => {
    // Set a consistent viewport
    await page.setViewportSize({ width: 1280, height: 800 })
  })

  test('capture homepage loading state', async ({ page }) => {
    // Capture the loading animation
    await page.goto('/', { waitUntil: 'commit' })
    await captureScreenshot(page, 'homepage-loading')

    // Wait a bit for animation progress
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'homepage-loading-progress')
  })

  test('capture homepage after load', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Let animations settle
    await page.waitForTimeout(1000)

    await captureScreenshot(page, 'homepage-loaded')
    await captureScreenshot(page, 'homepage-full', { fullPage: true })
  })

  test('capture empty chat state', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Focus on chat area
    const chatArea = page.locator('[data-testid="chat-interface"]').first()
    if (await chatArea.isVisible()) {
      await captureScreenshot(page, 'chat-empty-state')
    } else {
      await captureScreenshot(page, 'chat-empty-state')
    }
  })

  test('capture input bar states', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Empty input
    await captureScreenshot(page, 'input-empty')

    // Focus input
    const input = page.locator('textarea').first()
    if (await input.isVisible()) {
      await input.focus()
      await page.waitForTimeout(200)
      await captureScreenshot(page, 'input-focused')

      // Typing state
      await input.fill('This is a sample message to test the input bar appearance')
      await page.waitForTimeout(200)
      await captureScreenshot(page, 'input-with-text')

      // Long text
      await input.fill('This is a much longer message that tests how the input bar handles multiple lines of text. The input should grow to accommodate the text while respecting the maximum height limit.')
      await page.waitForTimeout(200)
      await captureScreenshot(page, 'input-multiline')
    }
  })

  test('capture button states', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Find and hover over buttons
    const buttons = page.locator('button:visible')
    const count = await buttons.count()

    if (count > 0) {
      // Capture default state
      await captureScreenshot(page, 'buttons-default')

      // Hover first button
      await buttons.first().hover()
      await page.waitForTimeout(200)
      await captureScreenshot(page, 'button-hover')
    }
  })

  test('capture settings modal', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Try to open settings
    const settingsBtn = page.locator('[data-testid="settings-button"], [aria-label*="settings" i], button:has-text("Settings")').first()
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click()
      await page.waitForTimeout(500)
      await captureScreenshot(page, 'settings-modal')

      // Close modal
      await page.keyboard.press('Escape')
    }
  })

  test('capture document panel', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Look for document panel or toggle
    const docPanel = page.locator('[data-testid="document-panel"], [data-testid="document-sidebar"]').first()
    if (await docPanel.isVisible()) {
      await captureScreenshot(page, 'document-panel')
    }

    // Try to toggle document stats
    const docStatsBtn = page.locator('[data-testid="toggle-doc-stats"], button:has-text("Documents")').first()
    if (await docStatsBtn.isVisible()) {
      await docStatsBtn.click()
      await page.waitForTimeout(300)
      await captureScreenshot(page, 'document-stats-expanded')
    }
  })

  test('capture mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await captureScreenshot(page, 'mobile-homepage')
    await captureScreenshot(page, 'mobile-full', { fullPage: true })
  })

  test('capture tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await captureScreenshot(page, 'tablet-homepage')
  })

  test('capture wide desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await captureScreenshot(page, 'desktop-wide')
  })

  test('capture keyboard shortcuts hint', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Look for keyboard hint
    const kbdHint = page.locator('[class*="keyboard"], kbd, [data-testid="keyboard-hint"]').first()
    if (await kbdHint.isVisible()) {
      await captureScreenshot(page, 'keyboard-hint')
    }

    // Try Cmd+K shortcut
    await page.keyboard.press('Meta+k')
    await page.waitForTimeout(200)
    await captureScreenshot(page, 'after-cmd-k')
  })

  test('capture error states (simulated)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Capture offline indicator if we can simulate it
    await page.context().setOffline(true)
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'offline-state')

    await page.context().setOffline(false)
  })

  test('capture reduced motion mode', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await captureScreenshot(page, 'reduced-motion')
  })

  test('capture high contrast mode', async ({ page }) => {
    // Emulate forced colors (high contrast)
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await captureScreenshot(page, 'high-contrast')
  })
})
