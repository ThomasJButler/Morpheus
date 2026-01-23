/**
 * Component Visual Regression Tests
 *
 * Tests for individual UI components to catch visual regressions.
 * Run with: npm run test:visual
 */

import { test, expect } from '@playwright/test'

test.describe('Button Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Disable animations
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    })
  })

  test('send button default state', async ({ page }) => {
    const sendButton = page.locator('[data-testid="send-button"], button[type="submit"]').first()

    if (await sendButton.isVisible()) {
      await expect(sendButton).toHaveScreenshot('send-button-default.png', {
        maxDiffPixels: 20,
      })
    }
  })

  test('send button hover state', async ({ page }) => {
    const sendButton = page.locator('[data-testid="send-button"], button[type="submit"]').first()

    if (await sendButton.isVisible()) {
      await sendButton.hover()
      await page.waitForTimeout(100)
      await expect(sendButton).toHaveScreenshot('send-button-hover.png', {
        maxDiffPixels: 30,
      })
    }
  })

  test('toolbar buttons', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"], [role="toolbar"]').first()

    if (await toolbar.isVisible()) {
      await expect(toolbar).toHaveScreenshot('toolbar.png', {
        maxDiffPixels: 100,
      })
    }
  })
})

test.describe('Modal Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Disable animations
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    })
  })

  test('settings modal appearance', async ({ page }) => {
    // Find and click settings button
    const settingsBtn = page
      .locator('[data-testid="settings-button"], [aria-label*="settings" i], button:has-text("Settings")')
      .first()

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click()
      await page.waitForTimeout(300)

      const modal = page.locator('[role="dialog"], [data-testid="settings-modal"]').first()
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('settings-modal.png', {
          maxDiffPixels: 100,
        })
      }
    }
  })

  test('confirm dialog appearance', async ({ page }) => {
    // Try to trigger a confirm dialog (e.g., clear chat)
    const clearBtn = page
      .locator('[data-testid="clear-button"], button:has-text("Clear"), button[aria-label*="clear" i]')
      .first()

    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await page.waitForTimeout(300)

      const confirmDialog = page.locator('[role="alertdialog"], [data-testid="confirm-dialog"]').first()
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toHaveScreenshot('confirm-dialog.png', {
          maxDiffPixels: 50,
        })
      }

      // Close dialog
      await page.keyboard.press('Escape')
    }
  })
})

test.describe('Input States Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Disable animations
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    })
  })

  test('textarea empty state', async ({ page }) => {
    const textarea = page.locator('textarea').first()

    if (await textarea.isVisible()) {
      await expect(textarea).toHaveScreenshot('textarea-empty.png', {
        maxDiffPixels: 30,
      })
    }
  })

  test('textarea focused state', async ({ page }) => {
    const textarea = page.locator('textarea').first()

    if (await textarea.isVisible()) {
      await textarea.focus()
      await page.waitForTimeout(100)
      await expect(textarea).toHaveScreenshot('textarea-focused.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('textarea with content', async ({ page }) => {
    const textarea = page.locator('textarea').first()

    if (await textarea.isVisible()) {
      await textarea.fill('This is a test message for visual regression testing')
      await page.waitForTimeout(100)
      await expect(textarea).toHaveScreenshot('textarea-with-content.png', {
        maxDiffPixels: 50,
      })
    }
  })
})

test.describe('Status Indicators Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Disable animations
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    })
  })

  test('RAG mode indicator', async ({ page }) => {
    const ragIndicator = page.locator('[data-testid="rag-mode"], [class*="rag"]').first()

    if (await ragIndicator.isVisible()) {
      await expect(ragIndicator).toHaveScreenshot('rag-indicator.png', {
        maxDiffPixels: 30,
      })
    }
  })

  test('system status indicator', async ({ page }) => {
    const statusIndicator = page.locator('[data-testid="system-status"], [class*="status"]').first()

    if (await statusIndicator.isVisible()) {
      await expect(statusIndicator).toHaveScreenshot('system-status.png', {
        maxDiffPixels: 30,
      })
    }
  })
})

test.describe('Loading States Visual Regression', () => {
  test('loading skeleton appearance', async ({ page }) => {
    // Navigate to page and try to capture loading state
    await page.goto('/', { waitUntil: 'commit' })

    // Immediately capture before full load
    const loadingState = page.locator('[data-testid="loading"], [class*="loading"], [class*="skeleton"]').first()

    if (await loadingState.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(loadingState).toHaveScreenshot('loading-skeleton.png', {
        maxDiffPixels: 100,
      })
    }
  })
})
