import { test, expect } from '@playwright/test'

test.describe('Morpheus Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays welcome screen', async ({ page }) => {
    await expect(page.getByText(/Welcome to Morpheus/i)).toBeVisible()
    await expect(page.getByText(/blue pill/i)).toBeVisible()
    await expect(page.getByText(/red pill/i)).toBeVisible()
  })

  test('allows pill selection', async ({ page }) => {
    // Select blue pill
    await page.click('[data-testid="blue-pill"]')
    await expect(page.getByText(/factual mode/i)).toBeVisible()

    // Select red pill
    await page.click('[data-testid="red-pill"]')
    await expect(page.getByText(/creative mode/i)).toBeVisible()
  })

  test('sends and receives messages', async ({ page }) => {
    // Wait for chat interface
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Type message
    const input = page.getByPlaceholderText(/ask morpheus/i)
    await input.fill('What is the Matrix?')

    // Send message
    await page.click('button:has-text("Send")')

    // Verify user message appears
    await expect(page.getByText('What is the Matrix?')).toBeVisible()

    // Wait for assistant response
    await expect(page.getByTestId('assistant-message')).toBeVisible({
      timeout: 10000,
    })
  })

  test('switches between RAG modes', async ({ page }) => {
    await page.waitForSelector('[data-testid="mode-selector"]')

    // Test simple mode
    await page.selectOption('[data-testid="mode-selector"]', 'simple')
    await expect(page.getByText(/semantic search/i)).toBeVisible()

    // Test hybrid mode
    await page.selectOption('[data-testid="mode-selector"]', 'hybrid')
    await expect(page.getByText(/cascading retrieval/i)).toBeVisible()

    // Test agentic mode
    await page.selectOption('[data-testid="mode-selector"]', 'agentic')
    await expect(page.getByText(/agentic reasoning/i)).toBeVisible()
  })

  test('displays citations in responses', async ({ page }) => {
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Send query
    const input = page.getByPlaceholderText(/ask morpheus/i)
    await input.fill('Test query')
    await page.click('button:has-text("Send")')

    // Wait for response with citations
    await page.waitForSelector('[data-testid="citation"]', { timeout: 10000 })

    // Verify citation details
    const citation = page.locator('[data-testid="citation"]').first()
    await expect(citation).toContainText(/source/i)
    await expect(citation).toContainText(/page/i)
  })

  test('shows streaming response', async ({ page }) => {
    await page.waitForSelector('[data-testid="chat-interface"]')

    const input = page.getByPlaceholderText(/ask morpheus/i)
    await input.fill('Tell me a story')
    await page.click('button:has-text("Send")')

    // Verify streaming indicator appears
    await expect(page.getByTestId('streaming-indicator')).toBeVisible()

    // Wait for streaming to complete
    await expect(page.getByTestId('streaming-indicator')).not.toBeVisible({
      timeout: 15000,
    })
  })

  test('handles errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', (route) => {
      route.abort('failed')
    })

    await page.waitForSelector('[data-testid="chat-interface"]')

    const input = page.getByPlaceholderText(/ask morpheus/i)
    await input.fill('Test error')
    await page.click('button:has-text("Send")')

    // Verify error message
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/try again/i)).toBeVisible()
  })

  test('persists conversation history', async ({ page }) => {
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Send first message
    const input = page.getByPlaceholderText(/ask morpheus/i)
    await input.fill('First message')
    await page.click('button:has-text("Send")')
    await page.waitForTimeout(1000)

    // Send second message
    await input.fill('Second message')
    await page.click('button:has-text("Send")')
    await page.waitForTimeout(1000)

    // Verify both messages are visible
    await expect(page.getByText('First message')).toBeVisible()
    await expect(page.getByText('Second message')).toBeVisible()

    // Reload page
    await page.reload()

    // Verify messages persist
    await expect(page.getByText('First message')).toBeVisible()
    await expect(page.getByText('Second message')).toBeVisible()
  })

  test('displays metrics when enabled', async ({ page }) => {
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Open metrics panel
    await page.click('[data-testid="metrics-toggle"]')

    // Verify metrics are visible
    await expect(page.getByText(/retrieval time/i)).toBeVisible()
    await expect(page.getByText(/relevance score/i)).toBeVisible()
    await expect(page.getByText(/tokens used/i)).toBeVisible()
  })

  test('Matrix rain animation can be toggled', async ({ page }) => {
    // Toggle Matrix rain off
    await page.click('[data-testid="settings-button"]')
    await page.click('[data-testid="matrix-rain-toggle"]')

    // Verify animation stopped
    await expect(page.locator('.matrix-rain')).not.toBeVisible()

    // Toggle back on
    await page.click('[data-testid="matrix-rain-toggle"]')
    await expect(page.locator('.matrix-rain')).toBeVisible()
  })
})

test.describe('Mobile responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('chat interface works on mobile', async ({ page }) => {
    await page.goto('/')

    // Verify mobile layout
    await expect(page.getByTestId('chat-interface')).toBeVisible()

    // Test input
    const input = page.getByPlaceholderText(/ask morpheus/i)
    await input.fill('Mobile test')
    await page.click('button:has-text("Send")')

    // Verify message appears
    await expect(page.getByText('Mobile test')).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/')

    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Verify focus is on input
    const input = page.getByPlaceholderText(/ask morpheus/i)
    await expect(input).toBeFocused()

    // Type and send with Enter
    await page.keyboard.type('Keyboard test')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Keyboard test')).toBeVisible()
  })

  test('has proper ARIA labels', async ({ page }) => {
    await page.goto('/')

    // Check for ARIA labels
    await expect(page.locator('[aria-label="Chat messages"]')).toBeVisible()
    await expect(page.locator('[aria-label="Message input"]')).toBeVisible()
    await expect(page.locator('[aria-label="Send message"]')).toBeVisible()
  })
})
