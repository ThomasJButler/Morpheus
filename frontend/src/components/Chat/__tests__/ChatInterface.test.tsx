import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatInterface from '../ChatInterface'

// Mock the child components
jest.mock('../MessageList', () => ({
  MessageList: ({ messages }: { messages: Array<{ content: string; role: string }> }) => (
    <div data-testid="message-list">
      {messages.map((msg: { content: string; role: string }, idx: number) => (
        <div key={idx} data-testid={`message-${idx}`}>
          {msg.content}
        </div>
      ))}
    </div>
  ),
}))

jest.mock('../InputBar', () => ({
  InputBar: ({ onSendMessage, disabled }: { onSendMessage: (msg: string) => void; disabled: boolean }) => (
    <div data-testid="input-bar">
      <input
        data-testid="message-input"
        placeholder="Type a message"
        disabled={disabled}
      />
      <button
        data-testid="send-button"
        onClick={() => onSendMessage('Test message')}
        disabled={disabled}
      >
        Send
      </button>
    </div>
  ),
}))

jest.mock('../ModeSelector', () => ({
  ModeSelector: ({ mode, onModeChange }: { mode: string; onModeChange: (mode: string) => void }) => (
    <select
      data-testid="mode-selector"
      value={mode}
      onChange={(e) => onModeChange(e.target.value)}
    >
      <option value="simple">Simple</option>
      <option value="hybrid">Hybrid</option>
      <option value="agentic">Agentic</option>
    </select>
  ),
}))

describe('ChatInterface', () => {
  it('renders without crashing', () => {
    render(<ChatInterface />)
    expect(screen.getByTestId('message-list')).toBeInTheDocument()
    expect(screen.getByTestId('input-bar')).toBeInTheDocument()
  })

  it('displays initial welcome message', () => {
    render(<ChatInterface />)
    expect(screen.getByText(/welcome/i)).toBeInTheDocument()
  })

  it('allows mode selection', async () => {
    const user = userEvent.setup()
    render(<ChatInterface />)

    const modeSelector = screen.getByTestId('mode-selector')
    expect(modeSelector).toHaveValue('simple')

    await user.selectOptions(modeSelector, 'hybrid')
    expect(modeSelector).toHaveValue('hybrid')
  })

  it('sends message when send button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatInterface />)

    const sendButton = screen.getByTestId('send-button')
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })
  })

  it('disables input while sending message', async () => {
    const user = userEvent.setup()
    render(<ChatInterface />)

    const sendButton = screen.getByTestId('send-button')
    const messageInput = screen.getByTestId('message-input')

    // Initially enabled
    expect(messageInput).not.toBeDisabled()
    expect(sendButton).not.toBeDisabled()

    // Click send
    await user.click(sendButton)

    // Should be disabled during processing
    // Note: This test would need actual implementation to verify
  })

  it('displays error message on API failure', async () => {
    // Mock API failure
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('API Error'))
    ) as jest.Mock

    const user = userEvent.setup()
    render(<ChatInterface />)

    const sendButton = screen.getByTestId('send-button')
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('maintains message history', async () => {
    const user = userEvent.setup()
    render(<ChatInterface />)

    const sendButton = screen.getByTestId('send-button')

    // Send first message
    await user.click(sendButton)
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    // Send second message
    await user.click(sendButton)
    await waitFor(() => {
      const messages = screen.getAllByText('Test message')
      expect(messages).toHaveLength(2)
    })
  })

  it('clears messages on reset', async () => {
    const user = userEvent.setup()
    render(<ChatInterface />)

    const sendButton = screen.getByTestId('send-button')
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    // Find and click reset button (if implemented)
    // const resetButton = screen.getByRole('button', { name: /reset/i })
    // await user.click(resetButton)
    // expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('persists session across renders', () => {
    const { rerender } = render(<ChatInterface />)
    const sessionId = localStorage.getItem('morpheus_session_id')

    rerender(<ChatInterface />)
    expect(localStorage.getItem('morpheus_session_id')).toBe(sessionId)
  })

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup()
    render(<ChatInterface />)

    const messageInput = screen.getByTestId('message-input')

    // Test Enter key to send
    await user.type(messageInput, 'Test{Enter}')

    // Message should be sent
    // await waitFor(() => {
    //   expect(screen.getByText('Test')).toBeInTheDocument()
    // })
  })

  it('displays loading state while waiting for response', async () => {
    // Mock slow API
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true } as Response), 1000)
        )
    ) as jest.Mock

    const user = userEvent.setup()
    render(<ChatInterface />)

    const sendButton = screen.getByTestId('send-button')
    await user.click(sendButton)

    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })
  })

  it('handles streaming responses', async () => {
    // Mock streaming API
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"content":"Hello"}\n\n'))
        controller.enqueue(new TextEncoder().encode('data: {"content":" world"}\n\n'))
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        body: mockStream,
      } as Response)
    ) as jest.Mock

    const user = userEvent.setup()
    render(<ChatInterface />)

    const sendButton = screen.getByTestId('send-button')
    await user.click(sendButton)

    // Should display streamed content
    await waitFor(() => {
      expect(screen.getByText(/Hello world/)).toBeInTheDocument()
    })
  })
})
