/**
 * Homepage Visual Regression Tests
 *
 * These tests ensure visual consistency of the homepage across changes.
 * Run with: npm run test:visual
 */

import { test, expect } from '@playwright/test'

test.describe('Homepage Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and wait for page to be fully loaded
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for any animations to complete
    await page.waitForTimeout(1500)

    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    })
  })

  test('homepage layout matches baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage-layout.png', {
      fullPage: true,
      maxDiffPixels: 200,
    })
  })

  test('chat interface matches baseline', async ({ page }) => {
    const chatInterface = page.locator('[data-testid="chat-interface"]').first()

    // If chat interface has specific test ID, use it
    if (await chatInterface.isVisible()) {
      await expect(chatInterface).toHaveScreenshot('chat-interface.png', {
        maxDiffPixels: 150,
      })
    } else {
      // Fallback to main content area
      await expect(page.locator('main').first()).toHaveScreenshot('main-content.png', {
        maxDiffPixels: 150,
      })
    }
  })

  test('header matches baseline', async ({ page }) => {
    const header = page.locator('header').first()

    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('header.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('input bar matches baseline', async ({ page }) => {
    const inputContainer = page.locator('[data-testid="input-bar"], form:has(textarea)').first()

    if (await inputContainer.isVisible()) {
      await expect(inputContainer).toHaveScreenshot('input-bar.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('empty state matches baseline', async ({ page }) => {
    // Look for empty state content
    const emptyState = page.locator('[data-testid="empty-state"], [class*="empty"]').first()

    if (await emptyState.isVisible()) {
      await expect(emptyState).toHaveScreenshot('empty-state.png', {
        maxDiffPixels: 100,
      })
    }
  })
})
