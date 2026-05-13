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

// Query type configuration — v2 tokens. Each entry maps to one of the
// mode-palette colours from Phase 0 (accent / mode-cyan / mode-amber /
// mode-purple / mode-red) so the chips stay coherent with the rest of the
// chat-col chrome.
const QUERY_TYPE_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  factual:     { label: 'Factual',     color: 'text-accent',      bgColor: 'bg-accent/10',      borderColor: 'border-accent/40',      icon: '📋' },
  conceptual:  { label: 'Conceptual',  color: 'text-mode-cyan',   bgColor: 'bg-mode-cyan/10',   borderColor: 'border-mode-cyan/40',   icon: '💡' },
  comparative: { label: 'Comparative', color: 'text-mode-amber',  bgColor: 'bg-mode-amber/10',  borderColor: 'border-mode-amber/40',  icon: '⚖️' },
  procedural:  { label: 'Procedural',  color: 'text-mode-amber',  bgColor: 'bg-mode-amber/10',  borderColor: 'border-mode-amber/40',  icon: '📝' },
  exploratory: { label: 'Exploratory', color: 'text-mode-purple', bgColor: 'bg-mode-purple/10', borderColor: 'border-mode-purple/40', icon: '🔍' },
  multi_part:  { label: 'Multi-Part',  color: 'text-mode-cyan',   bgColor: 'bg-mode-cyan/10',   borderColor: 'border-mode-cyan/40',   icon: '🔢' },
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
        bg-surface-card border border-edge-subtle
        rounded-v2-md
        slide-up-fade
        transition-all duration-300
        ${isExpanded ? 'max-h-[300px] overflow-y-auto' : 'max-h-[48px] overflow-hidden'}
      `}
    >
      {/* Collapsed Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-full flex items-center justify-between
          px-3 py-2.5
          hover:bg-surface-card-hover
          transition-colors duration-200
        "
        aria-expanded={isExpanded}
        aria-controls="insight-panel-content"
      >
        <div className="flex items-center gap-3">
          {/* Query type icon and label */}
          <div className={`
            flex items-center gap-2 px-2.5 py-1 rounded-full
            ${queryTypeConfig.bgColor} ${queryTypeConfig.borderColor} border
          `}>
            <span className="text-sm">{queryTypeConfig.icon}</span>
            <span className={`text-xs font-mono font-medium ${queryTypeConfig.color}`}>
              {queryTypeConfig.label} Query
            </span>
          </div>

          {/* Complexity percentage */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-surface-input rounded-full overflow-hidden border border-edge-subtle">
              <div
                className={`
                  h-full rounded-full transition-all duration-500
                  ${analysis.complexity_score < 0.3 ? 'bg-accent' :
                    analysis.complexity_score < 0.7 ? 'bg-mode-amber' : 'bg-mode-red'}
                `}
                style={{ width: `${complexityPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-fg-muted tabular-nums">
              {complexityPercent}%
            </span>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-mode-cyan animate-pulse" />
              <span className="text-[10px] font-mono text-mode-cyan">Processing</span>
            </div>
          )}

          {/* Escalation badge */}
          {wasEscalated && (
            <span className="
              px-1.5 py-0.5 rounded text-[10px] font-mono font-medium
              bg-mode-amber/10 text-mode-amber border border-mode-amber/40
            ">
              Escalated
            </span>
          )}
        </div>

        {/* Toggle chevron */}
        <svg
          className={`
            w-4 h-4 text-fg-muted
            transition-transform duration-200
            ${isExpanded ? 'rotate-180' : ''}
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
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
            hideHeader={true}
          />
        </div>
      </div>
    </div>
  );
}
