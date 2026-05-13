'use client';

import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface MessageListProps {
  messages: ChatMessageType[];
  className?: string;
}

export default function MessageList({
  messages,
  className = '',
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      className={`
        p-1 sm:p-2 rounded-lg
        flex flex-col
        min-h-0
        ${className}
      `}
    >
      {/* Messages with staggered animations */}
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          index={index}
        />
      ))}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
    </div>
  );
}
