import React from 'react'
import { render, screen } from '@testing-library/react'
import { MessageList } from '../MessageList'

const mockMessages = [
  {
    id: '1',
    role: 'user' as const,
    content: 'Hello, Morpheus!',
    timestamp: new Date('2024-01-01'),
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: 'Greetings. Welcome to the Matrix.',
    timestamp: new Date('2024-01-01'),
    citations: [
      {
        source: 'doc.pdf',
        page: 1,
        relevance_score: 0.95,
        excerpt: 'Sample text',
      },
    ],
  },
]

describe('MessageList', () => {
  it('renders empty state when no messages', () => {
    render(<MessageList messages={[]} />)
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
  })

  it('renders all messages', () => {
    render(<MessageList messages={mockMessages} />)
    expect(screen.getByText('Hello, Morpheus!')).toBeInTheDocument()
    expect(screen.getByText(/Greetings. Welcome to the Matrix/)).toBeInTheDocument()
  })

  it('distinguishes user and assistant messages', () => {
    render(<MessageList messages={mockMessages} />)
    const userMessages = screen.getAllByTestId(/user-message/)
    const assistantMessages = screen.getAllByTestId(/assistant-message/)
    expect(userMessages).toHaveLength(1)
    expect(assistantMessages).toHaveLength(1)
  })

  it('displays citations when available', () => {
    render(<MessageList messages={mockMessages} />)
    expect(screen.getByText(/doc.pdf/)).toBeInTheDocument()
    expect(screen.getByText(/page 1/i)).toBeInTheDocument()
  })

  it('scrolls to bottom on new message', () => {
    const scrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    const { rerender } = render(<MessageList messages={[mockMessages[0]]} />)
    rerender(<MessageList messages={mockMessages} />)

    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('formats timestamps correctly', () => {
    render(<MessageList messages={mockMessages} />)
    // Check for formatted timestamp (format depends on implementation)
    const timestamps = screen.getAllByTestId('message-timestamp')
    expect(timestamps).toHaveLength(2)
  })

  it('handles long messages with proper wrapping', () => {
    const longMessage = {
      id: '3',
      role: 'assistant' as const,
      content: 'A'.repeat(1000),
      timestamp: new Date(),
    }
    render(<MessageList messages={[longMessage]} />)
    expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument()
  })

  it('displays loading indicator for streaming messages', () => {
    const streamingMessage = {
      id: '4',
      role: 'assistant' as const,
      content: 'Loading...',
      timestamp: new Date(),
      isStreaming: true,
    }
    render(<MessageList messages={[streamingMessage]} />)
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument()
  })
})
