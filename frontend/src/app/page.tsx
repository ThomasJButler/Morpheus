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
      <div className="relative z-10 container mx-auto px-4 py-2">
        {/* Header */}
        <header className="mb-2 text-center">
          <h1 className="text-3xl font-bold matrix-gradient font-mono">
            MORPHEUS
          </h1>
          <p className="text-matrix-green-dim/70 text-xs font-mono">
            AI-Powered Document Intelligence
          </p>
        </header>

        {/* Chat Interface */}
        <div className="max-w-6xl mx-auto">
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