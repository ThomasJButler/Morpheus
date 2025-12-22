'use client';

import { useState, useEffect } from 'react';
import { QueryAnalysis, RAGMode, EnhancedRetrievalMetrics } from '@/lib/types';
import QueryInsight from './QueryInsight';

interface FloatingInsightPanelProps {
  analysis: QueryAnalysis;
  modeUsed: RAGMode;
  metrics?: EnhancedRetrievalMetrics;
  wasEscalated: boolean;
  isProcessing: boolean;
}

const STORAGE_KEY = 'morpheus-insight-panel-expanded';

// Query type configuration - consistent with QueryInsight
const QUERY_TYPE_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  factual: { label: 'Factual', color: 'text-matrix-green', bgColor: 'bg-matrix-green/10', icon: '📋' },
  conceptual: { label: 'Conceptual', color: 'text-blue-400', bgColor: 'bg-blue-400/10', icon: '💡' },
  comparative: { label: 'Comparative', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', icon: '⚖️' },
  procedural: { label: 'Procedural', color: 'text-orange-400', bgColor: 'bg-orange-400/10', icon: '📝' },
  exploratory: { label: 'Exploratory', color: 'text-purple-400', bgColor: 'bg-purple-400/10', icon: '🔍' },
  multi_part: { label: 'Multi-Part', color: 'text-matrix-cyan', bgColor: 'bg-matrix-cyan/10', icon: '🔢' },
};

export default function FloatingInsightPanel({
  analysis,
  modeUsed,
  metrics,
  wasEscalated,
  isProcessing,
}: FloatingInsightPanelProps) {
  // Initialize from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded));
    } catch {
      // Ignore localStorage errors
    }
  }, [isExpanded]);

  const queryTypeConfig = QUERY_TYPE_CONFIG[analysis.query_type] || QUERY_TYPE_CONFIG.factual;
  const complexityPercent = Math.round(analysis.complexity_score * 100);

  return (
    <div
      className={`
        flex-shrink-0 mx-2 mb-2
        bg-matrix-black/95 backdrop-blur-md
        border border-matrix-green/30
        rounded-lg
        shadow-lg shadow-matrix-black/50
        slide-up-fade
        transition-all duration-300
        ${isExpanded ? 'max-h-[300px] overflow-y-auto scrollbar-matrix' : 'max-h-[48px] overflow-hidden'}
      `}
    >
      {/* Collapsed Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-full flex items-center justify-between
          px-3 py-2.5
          hover:bg-matrix-green/5
          transition-colors duration-200
        "
        aria-expanded={isExpanded}
        aria-controls="insight-panel-content"
      >
        <div className="flex items-center gap-3">
          {/* Query type icon and label */}
          <div className={`
            flex items-center gap-2 px-2.5 py-1 rounded-full
            ${queryTypeConfig.bgColor} border border-current/20
          `}>
            <span className="text-sm">{queryTypeConfig.icon}</span>
            <span className={`text-xs font-mono font-medium ${queryTypeConfig.color}`}>
              {queryTypeConfig.label} Query
            </span>
          </div>

          {/* Complexity percentage */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-matrix-white/10 rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full transition-all duration-500
                  ${analysis.complexity_score < 0.3 ? 'bg-matrix-green' :
                    analysis.complexity_score < 0.7 ? 'bg-yellow-400' : 'bg-orange-400'}
                `}
                style={{ width: `${complexityPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-matrix-white/50">
              {complexityPercent}%
            </span>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-matrix-cyan rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-matrix-cyan">Processing</span>
            </div>
          )}

          {/* Escalation badge */}
          {wasEscalated && (
            <span className="
              px-1.5 py-0.5 rounded text-[10px] font-mono font-medium
              bg-orange-400/10 text-orange-400 border border-orange-400/30
            ">
              Escalated
            </span>
          )}
        </div>

        {/* Toggle chevron */}
        <svg
          className={`
            w-4 h-4 text-matrix-white/40
            transition-transform duration-200
            ${isExpanded ? 'rotate-180' : ''}
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      <div
        id="insight-panel-content"
        className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isExpanded ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div className="px-2 pb-2">
          <QueryInsight
            analysis={analysis}
            modeUsed={modeUsed}
            metrics={metrics}
            wasEscalated={wasEscalated}
            defaultExpanded={true}
          />
        </div>
      </div>
    </div>
  );
}
