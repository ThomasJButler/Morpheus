'use client';

import { useEffect, useState } from 'react';

interface LoadingPulseProps {
  text?: string;
  variant?: 'default' | 'compact' | 'elaborate';
}

// Matrix characters for the animated background
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

function MatrixChar({ delay }: { delay: number }) {
  const [char, setChar] = useState('');

  useEffect(() => {
    const randomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    setChar(randomChar());

    const interval = setInterval(() => {
      setChar(randomChar());
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="matrix-char"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${delay}ms`,
        animationDuration: `${1500 + Math.random() * 1000}ms`,
      }}
    >
      {char}
    </span>
  );
}

// Animated terminal/brain icon
function AnimatedIcon() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* Outer pulse ring */}
      <div className="absolute inset-0 rounded-lg bg-matrix-green/20 pulse-ring" />

      {/* Inner icon */}
      <svg
        className="w-6 h-6 text-matrix-green relative z-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {/* Terminal/Monitor icon */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          className="animate-pulse"
        />
        {/* Animated cursor line inside */}
        <line
          x1="7"
          y1="8"
          x2="12"
          y2="8"
          strokeWidth={2}
          className="animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
      </svg>
    </div>
  );
}

export default function LoadingPulse({
  text = 'Morpheus is thinking',
  variant = 'default',
}: LoadingPulseProps) {
  const [displayText, setDisplayText] = useState('');

  // Typewriter effect for the text
  useEffect(() => {
    let index = 0;
    setDisplayText('');

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        // Reset and loop
        setTimeout(() => {
          index = 0;
          setDisplayText('');
        }, 1000);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [text]);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-matrix-green font-mono text-sm">
        <div className="typing-indicator">
          <span />
          <span />
          <span />
        </div>
        <span>{text}</span>
      </div>
    );
  }

  if (variant === 'elaborate') {
    return (
      <div className="relative p-6 bg-matrix-black/60 rounded-lg border border-matrix-green/30 overflow-hidden animate-fade-in">
        {/* Matrix rain background */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {[...Array(8)].map((_, i) => (
            <MatrixChar key={i} delay={i * 200} />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center gap-4">
          <AnimatedIcon />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-matrix-green font-mono text-sm font-semibold">
                {displayText}
              </span>
              <span className="terminal-cursor-animated" />
            </div>

            {/* Progress bar */}
            <div className="progress-bar-animated w-full max-w-[200px]" />
          </div>
        </div>

        {/* Shimmer overlay */}
        <div className="absolute inset-0 shimmer pointer-events-none" />
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center gap-3 p-3 bg-matrix-black/50 rounded-lg border-l-4 border-l-matrix-green animate-fade-in hover:bg-matrix-black/60 transition-colors">
      <AnimatedIcon />

      <div className="flex items-center gap-2">
        <span className="text-matrix-green font-mono text-sm">
          {displayText}
        </span>
        <span className="terminal-cursor-animated h-4" />
      </div>
    </div>
  );
}