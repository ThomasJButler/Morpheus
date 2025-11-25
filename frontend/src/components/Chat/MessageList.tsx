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
    <div className={`
      border-2 border-matrix-green/30 p-4 rounded-lg overflow-y-auto
      flex-grow flex flex-col bg-matrix-black/20
      ${className}
    `}>
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="text-center py-8 text-matrix-green/60">
          <p className="text-lg mb-2 font-mono">The Matrix has you...</p>
          <p className="text-sm opacity-70">Ask a question to begin</p>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start my-2">
          <LoadingPulse text="Morpheus is thinking" />
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}