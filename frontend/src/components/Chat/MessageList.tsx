'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import LoadingPulse from '../UI/LoadingPulse';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface MessageListProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
  className?: string;
}

export default function MessageList({
  messages,
  isLoading = false,
  className = '',
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      className={`
        p-1 sm:p-2 rounded-lg
        flex-grow flex flex-col
        ${className}
      `}
    >
      {/* Messages */}
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start my-2 ml-2 sm:ml-0" aria-live="polite" aria-label="Loading">
          <LoadingPulse text="Morpheus is thinking" />
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}
