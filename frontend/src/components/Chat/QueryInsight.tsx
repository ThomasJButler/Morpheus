'use client';

import { useState } from 'react';
import { QueryAnalysis, RAGMode, EnhancedRetrievalMetrics } from '@/lib/types';

interface QueryInsightProps {
  analysis: QueryAnalysis;
  modeUsed: RAGMode;
  wasEscalated: boolean;
  confidenceScore?: number;
  metrics?: EnhancedRetrievalMetrics;
  defaultExpanded?: boolean;
  hideHeader?: boolean;
}

// Query type configuration
const QUERY_TYPE_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: string;
}> = {
  factual: { label: 'Factual', color: 'text-matrix-green', icon: '📋' },
  conceptual: { label: 'Conceptual', color: 'text-blue-400', icon: '💡' },
  comparative: { label: 'Comparative', color: 'text-yellow-400', icon: '⚖️' },
  procedural: { label: 'Procedural', color: 'text-orange-400', icon: '📝' },
  exploratory: { label: 'Exploratory', color: 'text-purple-400', icon: '🔍' },
  multi_part: { label: 'Multi-Part', color: 'text-matrix-cyan', icon: '🔢' },
};

// Complexity visualization
function ComplexityBar({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const segments = 5;
  const filledSegments = Math.ceil(score * segments);

  const getColor = (index: number) => {
    if (index >= filledSegments) return 'bg-matrix-white/10';
    if (score < 0.3) return 'bg-matrix-green';
    if (score < 0.7) return 'bg-yellow-400';
    return 'bg-orange-400';
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-3 rounded-sm transition-colors duration-300 ${getColor(i)}`}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono text-matrix-white/50">
        {percentage}%
      </span>
    </div>
  );
}

// Keyword chips
function KeywordChips({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.slice(0, 5).map((keyword, idx) => (
        <span
          key={idx}
          className="
            px-2 py-0.5 rounded-full
            text-[10px] font-mono
            bg-matrix-green/10 text-matrix-green/80
            border border-matrix-green/20
          "
        >
          {keyword}
        </span>
      ))}
      {keywords.length > 5 && (
        <span className="text-[10px] font-mono text-matrix-white/40">
          +{keywords.length - 5} more
        </span>
      )}
    </div>
  );
}

// Insight indicator badges
function InsightBadges({ analysis }: { analysis: QueryAnalysis }) {
  const badges: { label: string; color: string; show: boolean }[] = [
    { label: 'Ambiguous', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', show: analysis.is_ambiguous },
    { label: 'Needs Rewriting', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', show: analysis.needs_rewriting },
  ];

  const visibleBadges = badges.filter(b => b.show);
  if (!visibleBadges.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleBadges.map((badge, idx) => (
        <span
          key={idx}
          className={`
            px-2 py-0.5 rounded-full
            text-[10px] font-mono font-medium
            border
            ${badge.color}
          `}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export default function QueryInsight({
  analysis,
  modeUsed,
  wasEscalated,
  confidenceScore,
  metrics,
  defaultExpanded = false,
  hideHeader = false,
}: QueryInsightProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const queryTypeConfig = QUERY_TYPE_CONFIG[analysis.query_type] || QUERY_TYPE_CONFIG.factual;

  // When header is hidden (embedded mode), always show content expanded
  if (hideHeader) {
    return (
      <div className="
        relative rounded-lg overflow-hidden
        bg-matrix-black/40 backdrop-blur-sm
        border border-matrix-green/20
      ">
        <div className="p-3 space-y-3">
          {/* Complexity bar */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-matrix-white/40">
              Query Complexity
            </span>
            <ComplexityBar score={analysis.complexity_score} />
          </div>

          {/* Suggested mode vs used mode */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-matrix-white/40">
              Mode Selection
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-matrix-white/50">
                Suggested: <span className="text-matrix-green">{analysis.suggested_mode}</span>
              </span>
              {modeUsed !== analysis.suggested_mode && (
                <>
                  <span className="text-matrix-white/30">→</span>
                  <span className="text-matrix-cyan">
                    Used: {modeUsed}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Keywords */}
          {analysis.keywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Key Terms
              </span>
              <KeywordChips keywords={analysis.keywords} />
            </div>
          )}

          {/* Insight badges */}
          <InsightBadges analysis={analysis} />

          {/* Reasoning */}
          {analysis.reasoning && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Analysis Reasoning
              </span>
              <p className="text-xs font-mono text-matrix-white/60 leading-relaxed">
                {analysis.reasoning}
              </p>
            </div>
          )}

          {/* Additional metrics if available */}
          {metrics && (
            <div className="pt-2 border-t border-matrix-green/10 space-y-2">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Retrieval Details
              </span>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-matrix-white/40">Query Time</span>
                  <span className="text-matrix-white/60">{metrics.query_time_ms}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-matrix-white/40">Results</span>
                  <span className="text-matrix-white/60">{metrics.num_results}</span>
                </div>
                {metrics.top_score != null && (
                  <div className="flex justify-between">
                    <span className="text-matrix-white/40">Top Score</span>
                    <span className="text-matrix-white/60">{(metrics.top_score * 100).toFixed(1)}%</span>
                  </div>
                )}
                {metrics.average_score != null && (
                  <div className="flex justify-between">
                    <span className="text-matrix-white/40">Avg Score</span>
                    <span className="text-matrix-white/60">{(metrics.average_score * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Hybrid mode scores */}
              {(metrics.dense_score != null || metrics.sparse_score != null) && (
                <div className="flex gap-3 pt-1">
                  {metrics.dense_score != null && (
                    <span className="text-[10px] font-mono text-matrix-cyan">
                      Dense: {(metrics.dense_score * 100).toFixed(1)}%
                    </span>
                  )}
                  {metrics.sparse_score != null && (
                    <span className="text-[10px] font-mono text-yellow-400">
                      Sparse: {(metrics.sparse_score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}

              {/* Escalation path */}
              {metrics.escalated_from && (
                <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                  <span className="text-matrix-white/40">Escalation:</span>
                  <span className="text-matrix-white/50">{metrics.escalated_from}</span>
                  <span className="text-matrix-white/30">→</span>
                  <span className="text-matrix-cyan">{metrics.mode_used}</span>
                  {metrics.escalation_reason && (
                    <span className="text-matrix-white/30 truncate max-w-[150px]" title={metrics.escalation_reason}>
                      ({metrics.escalation_reason})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtle gradient overlay */}
        <div className="
          absolute inset-0 pointer-events-none
          bg-gradient-to-br from-matrix-green/5 via-transparent to-transparent
          opacity-50
        " />
      </div>
    );
  }

  return (
    <div className="
      relative rounded-lg overflow-hidden
      bg-matrix-black/40 backdrop-blur-sm
      border border-matrix-green/20
      transition-all duration-300
      hover:border-matrix-green/30
    ">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-full flex items-center justify-between
          p-3 text-left
          hover:bg-matrix-green/5
          transition-colors duration-200
        "
      >
        <div className="flex items-center gap-3">
          {/* Query type icon */}
          <span className="text-lg">{queryTypeConfig.icon}</span>

          <div className="flex flex-col">
            <span className={`text-sm font-mono font-medium ${queryTypeConfig.color}`}>
              {queryTypeConfig.label} Query
            </span>
            <span className="text-[10px] font-mono text-matrix-white/40">
              Complexity: {Math.round(analysis.complexity_score * 100)}%
            </span>
          </div>
        </div>

        {/* Right side indicators */}
        <div className="flex items-center gap-3">
          {/* Confidence indicator */}
          {confidenceScore != null && (
            <div className="hidden sm:flex items-center gap-1.5">
              <div
                className={`
                  w-2 h-2 rounded-full
                  ${confidenceScore >= 0.8 ? 'bg-matrix-green' :
                    confidenceScore >= 0.6 ? 'bg-yellow-400' : 'bg-orange-400'}
                `}
              />
              <span className="text-[10px] font-mono text-matrix-white/50">
                {Math.round(confidenceScore * 100)}%
              </span>
            </div>
          )}

          {/* Escalation indicator */}
          {wasEscalated && (
            <span className="
              px-1.5 py-0.5 rounded
              text-[10px] font-mono font-medium
              bg-orange-400/10 text-orange-400 border border-orange-400/30
            ">
              Escalated
            </span>
          )}

          {/* Expand/collapse arrow */}
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
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-3 pt-0 space-y-3 border-t border-matrix-green/10">
          {/* Complexity bar */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-matrix-white/40">
              Query Complexity
            </span>
            <ComplexityBar score={analysis.complexity_score} />
          </div>

          {/* Suggested mode vs used mode */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-matrix-white/40">
              Mode Selection
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-matrix-white/50">
                Suggested: <span className="text-matrix-green">{analysis.suggested_mode}</span>
              </span>
              {modeUsed !== analysis.suggested_mode && (
                <>
                  <span className="text-matrix-white/30">→</span>
                  <span className="text-matrix-cyan">
                    Used: {modeUsed}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Keywords */}
          {analysis.keywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Key Terms
              </span>
              <KeywordChips keywords={analysis.keywords} />
            </div>
          )}

          {/* Insight badges */}
          <InsightBadges analysis={analysis} />

          {/* Reasoning */}
          {analysis.reasoning && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Analysis Reasoning
              </span>
              <p className="text-xs font-mono text-matrix-white/60 leading-relaxed">
                {analysis.reasoning}
              </p>
            </div>
          )}

          {/* Additional metrics if available */}
          {metrics && (
            <div className="pt-2 border-t border-matrix-green/10 space-y-2">
              <span className="text-[10px] font-mono text-matrix-white/40">
                Retrieval Details
              </span>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-matrix-white/40">Query Time</span>
                  <span className="text-matrix-white/60">{metrics.query_time_ms}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-matrix-white/40">Results</span>
                  <span className="text-matrix-white/60">{metrics.num_results}</span>
                </div>
                {metrics.top_score != null && (
                  <div className="flex justify-between">
                    <span className="text-matrix-white/40">Top Score</span>
                    <span className="text-matrix-white/60">{(metrics.top_score * 100).toFixed(1)}%</span>
                  </div>
                )}
                {metrics.average_score != null && (
                  <div className="flex justify-between">
                    <span className="text-matrix-white/40">Avg Score</span>
                    <span className="text-matrix-white/60">{(metrics.average_score * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Hybrid mode scores */}
              {(metrics.dense_score != null || metrics.sparse_score != null) && (
                <div className="flex gap-3 pt-1">
                  {metrics.dense_score != null && (
                    <span className="text-[10px] font-mono text-matrix-cyan">
                      Dense: {(metrics.dense_score * 100).toFixed(1)}%
                    </span>
                  )}
                  {metrics.sparse_score != null && (
                    <span className="text-[10px] font-mono text-yellow-400">
                      Sparse: {(metrics.sparse_score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}

              {/* Escalation path */}
              {metrics.escalated_from && (
                <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                  <span className="text-matrix-white/40">Escalation:</span>
                  <span className="text-matrix-white/50">{metrics.escalated_from}</span>
                  <span className="text-matrix-white/30">→</span>
                  <span className="text-matrix-cyan">{metrics.mode_used}</span>
                  {metrics.escalation_reason && (
                    <span className="text-matrix-white/30 truncate max-w-[150px]" title={metrics.escalation_reason}>
                      ({metrics.escalation_reason})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtle gradient overlay */}
      <div className="
        absolute inset-0 pointer-events-none
        bg-gradient-to-br from-matrix-green/5 via-transparent to-transparent
        opacity-50
      " />
    </div>
  );
}
