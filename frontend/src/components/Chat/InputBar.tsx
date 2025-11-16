'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import Button from '../UI/Button';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function InputBar({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}: InputBarProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end space-x-2">
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="matrix-input resize-none min-h-[40px] max-h-[120px] pr-12"
          style={{
            height: 'auto',
            overflowY: message.split('\n').length > 3 ? 'auto' : 'hidden',
          }}
        />

        {/* Character counter */}
        <span className="absolute bottom-2 right-2 text-xs text-matrix-white/30">
          {message.length}/2000
        </span>
      </div>

      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        variant="primary"
      >
        Send
      </Button>
    </div>
  );
}