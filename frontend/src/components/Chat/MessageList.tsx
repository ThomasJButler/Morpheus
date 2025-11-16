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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={`flex items-center justify-center text-matrix-white/50 ${className}`}>
        <div className="text-center">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Ask a question to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`overflow-y-auto space-y-4 pr-2 ${className}`}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="flex justify-start pl-4">
          <LoadingPulse text="Thinking" />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}