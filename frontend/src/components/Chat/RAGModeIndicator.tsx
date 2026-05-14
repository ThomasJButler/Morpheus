'use client';

import { RAGMode, EnhancedRetrievalMetrics } from '@/lib/types';

interface RAGModeIndicatorProps {
  mode: RAGMode;
  metrics?: EnhancedRetrievalMetrics;
  isProcessing?: boolean;
  compact?: boolean;
}

// Mode configuration with colors and icons
const MODE_CONFIG: Record<RAGMode, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}> = {
  simple: {
    label: 'Simple',
    color: 'text-matrix-green',
    bgColor: 'bg-matrix-green/10',
    borderColor: 'border-matrix-green/30',
    icon: '⚡',
    description: 'Fast semantic search',
  },
  hybrid: {
    label: 'Hybrid',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    icon: '🔀',
    description: 'Dense + Sparse retrieval',
  },
  agentic: {
    label: 'Agentic',
    color: 'text-matrix-cyan',
    bgColor: 'bg-matrix-cyan/10',
    borderColor: 'border-matrix-cyan/30',
    icon: '🧠',
    description: 'AI agent with tools',
  },
  auto: {
    label: 'Auto',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
    icon: '🎯',
    description: 'Intelligent routing',
  },
};

// Confidence level indicator
function ConfidenceIndicator({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (score >= 0.8) return 'bg-matrix-green';
    if (score >= 0.6) return 'bg-yellow-400';
    return 'bg-orange-400';
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-matrix-black/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-matrix-white/50">
        {percentage}%
      </span>
    </div>
  );
}

// Escalation badge
function EscalationBadge({ from, reason }: { from: RAGMode; reason?: string }) {
  const fromConfig = MODE_CONFIG[from];

  return (
    <div className="flex items-center gap-1 text-[10px] font-mono">
      <span className="text-matrix-white/40">Escalated from</span>
      <span className={`${fromConfig.color} font-medium`}>
        {fromConfig.icon} {fromConfig.label}
      </span>
      {reason && (
        <span className="text-matrix-white/30" title={reason}>
          • {reason.slice(0, 20)}...
        </span>
      )}
    </div>
  );
}

export default function RAGModeIndicator({
  mode,
  metrics,
  isProcessing = false,
  compact = false,
}: RAGModeIndicatorProps) {
  // Use actual mode from metrics if available (for AUTO routing)
  const actualMode = metrics?.mode_used || mode;
  const actualConfig = MODE_CONFIG[actualMode];
  const wasRouted = mode === 'auto' && metrics?.mode_used && metrics.mode_used !== 'auto';
  const wasEscalated = metrics?.escalated_from != null;

  if (compact) {
    // Minimal inline badge
    return (
      <span
        className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full
          text-[10px] font-mono font-medium
          ${actualConfig.bgColor} ${actualConfig.color} ${actualConfig.borderColor}
          border transition-all duration-200
          ${isProcessing ? 'animate-pulse' : ''}
        `}
        title={actualConfig.description}
      >
        <span>{actualConfig.icon}</span>
        <span>{actualConfig.label}</span>
        {isProcessing && <span className="ml-1">...</span>}
      </span>
    );
  }

  return (
    <div
      className={`
        flex flex-col gap-2 p-3 rounded-lg
        ${actualConfig.bgColor} ${actualConfig.borderColor}
        border backdrop-blur-sm
        transition-all duration-300
        ${isProcessing ? 'animate-pulse' : ''}
      `}
    >
      {/* Mode Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{actualConfig.icon}</span>
          <div>
            <span className={`text-sm font-mono font-bold ${actualConfig.color}`}>
              {actualConfig.label} Mode
            </span>
            {wasRouted && (
              <span className="ml-2 text-[10px] text-matrix-white/40">
                (auto-selected)
              </span>
            )}
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-matrix-green rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-matrix-green/70">
              Processing...
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-matrix-white/50 font-mono">
        {actualConfig.description}
      </p>

      {/* Metrics */}
      {metrics && (
        <div className="flex flex-col gap-2 pt-2 border-t border-matrix-white/10">
          {/* Confidence */}
          {metrics.mode_confidence != null && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Confidence
              </span>
              <ConfidenceIndicator score={metrics.mode_confidence} />
            </div>
          )}

          {/* Query time */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-matrix-white/40">
              Query time
            </span>
            <span className="text-[10px] font-mono text-matrix-white/60">
              {metrics.query_time_ms}ms
            </span>
          </div>

          {/* Results */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-matrix-white/40">
              Results
            </span>
            <span className="text-[10px] font-mono text-matrix-white/60">
              {metrics.num_results} chunks
            </span>
          </div>

          {/* Tool calls (agentic mode) */}
          {metrics.tool_calls_made > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Tool calls
              </span>
              <span className="text-[10px] font-mono text-matrix-cyan">
                {metrics.tool_calls_made}
              </span>
            </div>
          )}

          {/* Reranked indicator */}
          {metrics.reranked && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-matrix-green/70">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Reranked for precision
            </div>
          )}

          {/* Query rewritten */}
          {metrics.query_rewritten && metrics.original_query && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Query enhanced from:
              </span>
              <span className="text-[10px] font-mono text-matrix-white/30 italic truncate">
                &ldquo;{metrics.original_query}&rdquo;
              </span>
            </div>
          )}

          {/* Escalation info */}
          {wasEscalated && metrics.escalated_from && (
            <div className="pt-1 border-t border-matrix-white/10">
              <EscalationBadge
                from={metrics.escalated_from}
                reason={metrics.escalation_reason}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
