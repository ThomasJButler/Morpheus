'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/Chat/ChatInterface';
import MatrixRain from '@/components/UI/MatrixRain';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showMatrixRain, setShowMatrixRain] = useState(false); // Default to false to avoid canvas issues during init

  useEffect(() => {
    // Force mount after timeout as fallback (prevents infinite loading)
    const timeout = setTimeout(() => {
      setMounted(true);
    }, 3000);

    setMounted(true);
    // Check if Matrix rain should be enabled
    const enableRain = process.env.NEXT_PUBLIC_ENABLE_MATRIX_RAIN === 'true';
    setShowMatrixRain(enableRain);

    return () => clearTimeout(timeout);
  }, []);

  if (!mounted) {
    // Show Matrix-themed loading screen
    return (
      <div className="relative min-h-screen bg-matrix-black flex items-center justify-center overflow-hidden">
        {/* Matrix Rain Background */}
        {showMatrixRain && <MatrixRain />}

        {/* Loading Content */}
        <div className="relative z-10 text-center animate-fade-in">
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-4 matrix-gradient font-mono animate-pulse">
              MORPHEUS
            </h1>
            <div className="flex items-center justify-center space-x-2 text-matrix-green text-xl font-mono">
              <span>Initializing</span>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
            </div>
          </div>

          {/* Matrix Quotes Rotation */}
          <div className="space-y-3 text-matrix-white/60 text-sm font-mono italic">
            <p className="animate-pulse">&quot;Free your mind&quot;</p>
            <p className="animate-pulse" style={{ animationDelay: '1s' }}>
              &quot;Follow the white rabbit&quot;
            </p>
            <p className="animate-pulse" style={{ animationDelay: '2s' }}>
              &quot;Welcome to the real world&quot;
            </p>
          </div>

          {/* Loading Bar */}
          <div className="mt-8 w-64 mx-auto">
            <div className="h-1 bg-matrix-black/50 rounded-full overflow-hidden border border-matrix-green/30">
              <div className="h-full bg-matrix-green animate-pulse w-full"></div>
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
      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-2">
        {/* Header */}
        <header className="mb-2 flex items-center justify-center gap-2 sm:gap-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold matrix-gradient font-mono">
              MORPHEUS
            </h1>
            <p className="text-matrix-green-dim/70 text-xs font-mono">
              AI-Powered Document Intelligence
            </p>
          </div>
          <a
            href="https://github.com/ThomasJButler/Morpheus"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full border border-matrix-green/30 text-matrix-green/70 hover:text-matrix-green hover:bg-matrix-green/10 hover:border-matrix-green/50 transition-all"
            title="View on GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
        </header>

        {/* Chat Interface */}
        <div className="max-w-7xl mx-auto">
          <ChatInterface />
        </div>

        {/* Footer */}
        <footer className="mt-2 text-center text-matrix-white/30 text-xs font-mono">
          <p>Powered by Claude &amp; Pinecone</p>
        </footer>
      </div>
    </div>
  );
}