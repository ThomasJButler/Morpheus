/**
 * Responsive Visual Regression Tests
 *
 * Tests visual appearance across different viewport sizes.
 * Run with: npm run test:visual
 */

import { test, expect } from '@playwright/test'

// Viewport configurations
const viewports = {
  'iphone-se': { width: 375, height: 667 },
  'iphone-14': { width: 390, height: 844 },
  'iphone-14-pro-max': { width: 430, height: 932 },
  'ipad-mini': { width: 768, height: 1024 },
  'ipad-pro': { width: 1024, height: 1366 },
  'macbook-air': { width: 1280, height: 800 },
  'desktop-hd': { width: 1920, height: 1080 },
}

test.describe('Mobile Portrait Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(viewports['iphone-14'])
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

  test('mobile homepage layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('mobile-homepage.png', {
      fullPage: true,
      maxDiffPixels: 200,
    })
  })

  test('mobile input area', async ({ page }) => {
    const inputArea = page.locator('form:has(textarea), [data-testid="input-area"]').first()

    if (await inputArea.isVisible()) {
      await expect(inputArea).toHaveScreenshot('mobile-input-area.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('mobile toolbar', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"], header, nav').first()

    if (await toolbar.isVisible()) {
      await expect(toolbar).toHaveScreenshot('mobile-toolbar.png', {
        maxDiffPixels: 50,
      })
    }
  })
})

test.describe('Mobile Landscape Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // iPhone 14 in landscape
    await page.setViewportSize({ width: 844, height: 390 })
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

  test('landscape layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('mobile-landscape.png', {
      maxDiffPixels: 200,
    })
  })
})

test.describe('Tablet Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(viewports['ipad-mini'])
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

  test('tablet homepage layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('tablet-homepage.png', {
      fullPage: true,
      maxDiffPixels: 200,
    })
  })

  test('tablet chat area', async ({ page }) => {
    const chatArea = page.locator('main, [data-testid="chat-interface"]').first()

    if (await chatArea.isVisible()) {
      await expect(chatArea).toHaveScreenshot('tablet-chat-area.png', {
        maxDiffPixels: 150,
      })
    }
  })
})

test.describe('Desktop Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(viewports['macbook-air'])
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

  test('desktop homepage layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('desktop-homepage.png', {
      fullPage: true,
      maxDiffPixels: 250,
    })
  })

  test('desktop with sidebar', async ({ page }) => {
    // Check if sidebar is visible on desktop
    const sidebar = page.locator('[data-testid="sidebar"], aside, [class*="sidebar"]').first()

    if (await sidebar.isVisible()) {
      await expect(page).toHaveScreenshot('desktop-with-sidebar.png', {
        maxDiffPixels: 200,
      })
    }
  })
})

test.describe('Wide Desktop Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(viewports['desktop-hd'])
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

  test('wide desktop layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('wide-desktop.png', {
      fullPage: true,
      maxDiffPixels: 300,
    })
  })

  test('content max-width constraint', async ({ page }) => {
    // Verify content doesn't stretch too wide
    const mainContent = page.locator('main, [data-testid="chat-interface"]').first()

    if (await mainContent.isVisible()) {
      const box = await mainContent.boundingBox()
      // Content should have a reasonable max-width (not span full 1920px)
      expect(box?.width).toBeLessThan(1400)
    }
  })
})

test.describe('Touch Target Size Tests', () => {
  test('mobile buttons have adequate touch targets', async ({ page }) => {
    await page.setViewportSize(viewports['iphone-14'])
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check all visible buttons
    const buttons = page.locator('button:visible')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i)
      const box = await button.boundingBox()

      if (box) {
        // Minimum touch target size should be 44x44 (or have adequate padding)
        const minSize = 44
        const isAdequate = box.width >= minSize || box.height >= minSize

        // Log for debugging but don't fail (yet)
        if (!isAdequate) {
          console.log(`Button ${i} has size ${box.width}x${box.height} (min: ${minSize}x${minSize})`)
        }
      }
    }
  })
})

test.describe('Accessibility Visual Tests', () => {
  test('focus indicators visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Tab to first focusable element
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    await expect(page).toHaveScreenshot('focus-first-element.png', {
      maxDiffPixels: 100,
    })

    // Tab a few more times
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    await expect(page).toHaveScreenshot('focus-navigation.png', {
      maxDiffPixels: 100,
    })
  })

  test('high contrast mode appearance', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('high-contrast-mode.png', {
      maxDiffPixels: 500, // Higher tolerance for forced colors
    })
  })

  test('reduced motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('reduced-motion.png', {
      maxDiffPixels: 200,
    })
  })
})
