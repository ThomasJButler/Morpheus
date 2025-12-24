'use client';

import { useEffect, useState } from 'react';

interface ThinkingInputStateProps {
  text?: string;
}

export default function ThinkingInputState({
  text = 'Morpheus is thinking...',
}: ThinkingInputStateProps) {
  const [displayText, setDisplayText] = useState('');

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    setDisplayText('');

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        // Reset and loop after a pause
        setTimeout(() => {
          index = 0;
          setDisplayText('');
        }, 1500);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div
      className="
        flex items-center gap-3
        px-4 py-3
        bg-matrix-black/40 backdrop-blur-sm
        border border-matrix-green/50
        rounded-md
        min-h-[48px]
        animate-fade-in
      "
      role="status"
      aria-live="polite"
      aria-label="Morpheus is processing your message"
    >
      {/* Typing indicator dots */}
      <div className="typing-indicator">
        <span />
        <span />
        <span />
      </div>

      {/* Animated text */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-matrix-green font-mono text-sm">
          {displayText}
        </span>
        <span className="terminal-cursor-animated h-4" />
      </div>

      {/* Disabled send button visual */}
      <div className="
        flex-shrink-0 px-4 py-2
        bg-matrix-green/20 text-matrix-green/40
        rounded-md font-mono text-sm font-bold uppercase tracking-wider
        cursor-not-allowed
      ">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </div>
  );
}
