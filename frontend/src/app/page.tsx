'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/Chat/ChatInterface';
import MatrixRain from '@/components/UI/MatrixRain';

// Matrix quotes for the loading screen
const MATRIX_QUOTES = [
  "Free your mind",
  "Follow the white rabbit",
  "Welcome to the real world",
  "There is no spoon",
  "The Matrix has you",
  "Wake up, Neo",
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showMatrixRain, setShowMatrixRain] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Force mount after timeout as fallback
    const timeout = setTimeout(() => {
      setMounted(true);
    }, 3000);

    setMounted(true);
    const enableRain = process.env.NEXT_PUBLIC_ENABLE_MATRIX_RAIN === 'true';
    setShowMatrixRain(enableRain);

    return () => clearTimeout(timeout);
  }, []);

  // Rotate quotes while loading
  useEffect(() => {
    if (mounted) return;

    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % MATRIX_QUOTES.length);
    }, 2000);

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => {
      clearInterval(quoteInterval);
      clearInterval(progressInterval);
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="relative min-h-screen bg-matrix-black flex items-center justify-center overflow-hidden">
        {/* Scanline effect */}
        <div className="scanline-overlay" />

        {/* Matrix Rain Background */}
        {showMatrixRain && <MatrixRain />}

        {/* Loading Content */}
        <div className="relative z-10 text-center animate-fade-in px-4">
          {/* Logo with glitch effect */}
          <div className="mb-8">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-4 gradient-text-animated font-mono glitch-text">
              MORPHEUS
            </h1>
            <div className="flex items-center justify-center gap-2 text-matrix-green text-lg sm:text-xl font-mono">
              <span className="text-matrix-green/70">Initializing</span>
              <span className="typing-indicator">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>

          {/* Rotating quote with typewriter effect */}
          <div className="h-12 flex items-center justify-center mb-8">
            <p
              key={currentQuote}
              className="text-matrix-white/60 text-sm sm:text-base font-mono italic animate-fade-in"
            >
              &quot;{MATRIX_QUOTES[currentQuote]}&quot;
            </p>
          </div>

          {/* Loading Progress Bar */}
          <div className="w-64 sm:w-80 mx-auto">
            <div className="flex justify-between text-xs font-mono text-matrix-green/60 mb-1">
              <span>Loading system</span>
              <span>{Math.min(100, Math.round(loadingProgress))}%</span>
            </div>
            <div className="h-1.5 bg-matrix-black/50 rounded-full overflow-hidden border border-matrix-green/30">
              <div
                className="h-full bg-gradient-to-r from-matrix-green to-matrix-cyan rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, loadingProgress)}%` }}
              />
            </div>
          </div>

          {/* Status indicators */}
          <div className="mt-6 flex flex-col items-center gap-1 text-xs font-mono text-matrix-white/40">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-matrix-green animate-pulse" />
              <span>Connecting to neural network</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Matrix Rain Background */}
      {showMatrixRain && <MatrixRain />}

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-1">
        {/* Header - Compact on mobile */}
        <header className="mb-1 sm:mb-2 flex items-center justify-center gap-2 sm:gap-4">
          <div className="text-center">
            <h1 className="text-xl sm:text-3xl font-bold gradient-text-animated font-mono hover:text-glow-green transition-all cursor-default">
              MORPHEUS
            </h1>
            <p className="hidden sm:block text-matrix-green-dim/60 text-xs font-mono tracking-wider">
              AI-Powered Document Intelligence
            </p>
          </div>

          {/* GitHub link with tooltip */}
          <div className="relative group">
            <a
              href="https://github.com/ThomasJButler/Morpheus"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-1.5 sm:p-2 rounded-full
                         border border-matrix-green/30 text-matrix-green/70
                         hover:text-matrix-green hover:bg-matrix-green/10
                         hover:border-matrix-green/50 hover:scale-110
                         transition-all duration-200"
              aria-label="View on GitHub"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>

            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1
                            bg-matrix-black/90 border border-matrix-green/30 rounded
                            text-xs font-mono text-matrix-green whitespace-nowrap
                            opacity-0 group-hover:opacity-100 transition-opacity
                            pointer-events-none">
              View on GitHub
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="max-w-7xl mx-auto">
          <ChatInterface />
        </div>

        {/* Footer - Hidden on mobile */}
        <footer className="hidden sm:block mt-2 text-center">
          <div className="inline-flex items-center gap-4 text-matrix-white/30 text-xs font-mono">
            <span>Powered by Claude &amp; Pinecone</span>
            <span className="text-matrix-green/30">•</span>
            <span className="text-matrix-white/20">
              <kbd className="px-1.5 py-0.5 bg-matrix-green/10 rounded text-[10px]">⌘K</kbd> to focus
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
