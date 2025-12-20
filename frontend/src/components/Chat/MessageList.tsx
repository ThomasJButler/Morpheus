'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Check if user is near bottom of scroll
  const checkIfNearBottom = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const threshold = 100; // pixels from bottom
      setIsNearBottom(scrollHeight - scrollTop - clientHeight < threshold);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if near bottom)
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isNearBottom]);

  // Track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkIfNearBottom);
      return () => container.removeEventListener('scroll', checkIfNearBottom);
    }
  }, [checkIfNearBottom]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      className={`
        p-1 sm:p-2 rounded-lg
        flex-grow flex flex-col
        overflow-y-auto scrollbar-matrix
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

      {/* Loading indicator */}
      {isLoading && (
        <div
          className="flex justify-start my-3 ml-2 sm:ml-0 mr-2 sm:mr-8 slide-in-right"
          aria-live="polite"
          aria-label="Morpheus is thinking"
        >
          <LoadingPulse text="Morpheus is thinking" variant="default" />
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} className="h-1 flex-shrink-0" />

      {/* Scroll to bottom button when not at bottom */}
      {!isNearBottom && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-32 right-8 z-20 p-2.5 rounded-full
                     bg-matrix-black/80 border border-matrix-green/50
                     text-matrix-green hover:bg-matrix-green/20 hover:border-matrix-green
                     transition-all duration-200 animate-fade-in
                     shadow-lg shadow-matrix-green/20 backdrop-blur-sm
                     hover:scale-110 active:scale-95"
          aria-label="Scroll to latest message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}
