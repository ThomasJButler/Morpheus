'use client';

import { RAGMode } from '@/lib/types';
import { clsx } from 'clsx';

interface ModeSelectorProps {
  selectedMode: RAGMode;
  onModeChange: (mode: RAGMode) => void;
  disabled?: boolean;
}

const modes: { value: RAGMode; label: string; description: string }[] = [
  {
    value: 'simple',
    label: 'Simple',
    description: 'Basic semantic search',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Cascading retrieval (recommended)',
  },
  {
    value: 'agentic',
    label: 'Agentic',
    description: 'AI-powered intelligent search',
  },
  {
    value: 'query_rewrite',
    label: 'Query Rewrite',
    description: 'Enhanced query optimization',
  },
];

export default function ModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: ModeSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-matrix-white/60 font-mono">RAG Mode:</span>
      <div className="flex space-x-1 bg-glass-bg p-1 rounded-lg border border-glass-border">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            disabled={disabled}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-mono transition-all duration-200',
              selectedMode === mode.value
                ? 'bg-matrix-green text-matrix-black'
                : 'text-matrix-green hover:bg-matrix-green/10',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={mode.description}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}