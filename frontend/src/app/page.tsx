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
    return null; // Prevent hydration mismatch
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
            Agentic RAG System that Reveals Knowledge
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