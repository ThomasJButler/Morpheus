import React from 'react'
import { render, screen } from '@testing-library/react'
import MessageList from '../MessageList'
import type { ChatMessage } from '@/lib/types'

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello, Morpheus!',
    timestamp: new Date('2026-01-01'),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Greetings. Welcome to the Matrix. [1]',
    timestamp: new Date('2026-01-01'),
    citations: [
      {
        index: 1,
        chunk_id: 'abc123def4567890',
        source: 'doc.pdf',
        page: 1,
        text_preview: 'Sample text',
        score: 0.95,
      },
    ],
    done: {
      retrieved: 3,
      cited: 1,
      grounded: true,
      model: 'qwen3.5:9b',
      mode: 'hybrid',
      generation_ms: 1200,
    },
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

  it('shows the grounded chip on a cited answer', () => {
    render(<MessageList messages={mockMessages} />)
    expect(screen.getByText('grounded')).toBeInTheDocument()
  })

  it('shows not grounded when the answer cited nothing', () => {
    const uncited: ChatMessage[] = [
      {
        ...mockMessages[1],
        id: '3',
        citations: [],
        done: { ...mockMessages[1].done!, cited: 0, grounded: false },
      },
    ]
    render(<MessageList messages={uncited} />)
    expect(screen.getByText('not grounded')).toBeInTheDocument()
  })

  it('scrolls to bottom on new message', () => {
    const scrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { rerender } = render(<MessageList messages={[mockMessages[0]]} />)
    rerender(<MessageList messages={mockMessages} />)
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('handles long messages without truncation', () => {
    const longMessage: ChatMessage = {
      id: '4',
      role: 'assistant',
      content: 'A'.repeat(1000),
      timestamp: new Date(),
    }
    render(<MessageList messages={[longMessage]} />)
    expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument()
  })
})
