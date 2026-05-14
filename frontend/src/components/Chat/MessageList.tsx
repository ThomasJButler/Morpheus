'use client';

import { useRef, useEffect, useState } from 'react';
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

  // Auto-scroll behaviour: track whether the bottom anchor is visible to the
  // user. If it is, follow new tokens to the bottom; if the user has scrolled
  // away from the bottom (anchor off-screen), respect that and stop yanking
  // them back. Otherwise streaming responses continuously override any
  // attempt to scroll up and review earlier messages.
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const anchor = messagesEndRef.current;
    if (!anchor) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!isAtBottom) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAtBottom]);

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
