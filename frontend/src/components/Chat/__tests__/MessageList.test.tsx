import React from 'react'
import { render, screen } from '@testing-library/react'
import MessageList from '../MessageList'

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
        text_preview: 'Sample text',
      },
    ],
  },
]

describe('MessageList', () => {
  it('renders all messages', () => {
    render(<MessageList messages={mockMessages} />)
    expect(screen.getByText('Hello, Morpheus!')).toBeInTheDocument()
    expect(screen.getByText(/Greetings. Welcome to the Matrix/)).toBeInTheDocument()
  })

  it('distinguishes user and assistant messages by data-role', () => {
    const { container } = render(<MessageList messages={mockMessages} />)
    expect(container.querySelectorAll('[data-role="user"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-role="assistant"]')).toHaveLength(1)
  })

  it('scrolls to bottom on new message', () => {
    const scrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    const { rerender } = render(<MessageList messages={[mockMessages[0]]} />)
    rerender(<MessageList messages={mockMessages} />)

    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('handles long messages without truncation', () => {
    const longMessage = {
      id: '3',
      role: 'assistant' as const,
      content: 'A'.repeat(1000),
      timestamp: new Date(),
    }
    render(<MessageList messages={[longMessage]} />)
    expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument()
  })
})
