import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputBar } from '../InputBar'

describe('InputBar', () => {
  const mockOnSendMessage = jest.fn()

  beforeEach(() => {
    mockOnSendMessage.mockClear()
  })

  it('renders input field and send button', () => {
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)
    expect(screen.getByPlaceholderText(/ask morpheus/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('sends message on button click', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'What is the Matrix?')
    await user.click(sendButton)

    expect(mockOnSendMessage).toHaveBeenCalledWith('What is the Matrix?')
  })

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    await user.type(input, 'Test message{Enter}')

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2')

    expect(mockOnSendMessage).not.toHaveBeenCalled()
    expect(input).toHaveValue('Line 1\nLine 2')
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    await user.type(input, 'Test')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(input).toHaveValue('')
  })

  it('disables input and button when disabled prop is true', () => {
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={true} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    expect(input).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  it('does not send empty messages', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })

  it('trims whitespace from messages', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    await user.type(input, '  Test message  ')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('shows character count when typing', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    await user.type(input, 'Test')

    expect(screen.getByText(/4 characters/i)).toBeInTheDocument()
  })

  it('prevents sending messages over character limit', async () => {
    const user = userEvent.setup()
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} maxLength={10} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'A'.repeat(100))
    expect(input).toHaveValue('A'.repeat(10))

    await user.click(sendButton)
    expect(mockOnSendMessage).toHaveBeenCalledWith('A'.repeat(10))
  })

  it('focuses input on mount', () => {
    render(<InputBar onSendMessage={mockOnSendMessage} disabled={false} />)
    const input = screen.getByPlaceholderText(/ask morpheus/i)
    expect(input).toHaveFocus()
  })
})
