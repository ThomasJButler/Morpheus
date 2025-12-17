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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Track scroll position to show/hide navigation buttons
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrolledFromTop = scrollTop > 200;
    const scrolledFromBottom = scrollHeight - scrollTop - clientHeight > 200;

    setShowBackToTop(scrolledFromTop);
    setShowScrollToBottom(scrolledFromBottom && messages.length > 3);
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      className={`
        p-2 sm:p-4 rounded-lg overflow-y-auto overflow-x-hidden
        flex-grow flex flex-col relative
        scrollbar-thin
        ${className}
      `}
    >
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

      {/* Back to Top Button - Fixed position for mobile */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-40 p-3 rounded-full
                     bg-matrix-green/20 border border-matrix-green/50
                     text-matrix-green hover:bg-matrix-green/30
                     backdrop-blur-sm shadow-lg
                     transition-all duration-200 active:scale-95
                     min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-16 z-40 p-3 rounded-full
                     bg-matrix-cyan/20 border border-matrix-cyan/50
                     text-matrix-cyan hover:bg-matrix-cyan/30
                     backdrop-blur-sm shadow-lg
                     transition-all duration-200 active:scale-95
                     min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}