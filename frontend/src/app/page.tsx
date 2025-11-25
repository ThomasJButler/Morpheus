'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/Chat/ChatInterface';
import MatrixRain from '@/components/UI/MatrixRain';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showMatrixRain, setShowMatrixRain] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Check if Matrix rain should be enabled
    const enableRain = process.env.NEXT_PUBLIC_ENABLE_MATRIX_RAIN === 'true';
    setShowMatrixRain(enableRain);
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
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-2 matrix-gradient font-mono">
            MORPHEUS
          </h1>
          <p className="text-matrix-green-dim text-lg">
            RAG System that Reveals Knowledge
          </p>
          <p className="text-matrix-white/60 text-sm mt-2 italic">
            &quot;Welcome to the real world...&quot;
          </p>
        </header>

        {/* Chat Interface */}
        <div className="max-w-6xl mx-auto">
          <ChatInterface />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-matrix-white/40 text-sm">
          <p>Powered by Claude, Pinecone, and the Matrix</p>
        </footer>
      </div>
    </div>
  );
}