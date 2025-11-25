'use client';

import { useState } from 'react';
import { Citation } from '@/lib/types';
import GlassPanel from '../UI/GlassPanel';
import { clsx } from 'clsx';

interface DocumentViewerProps {
  citations: Citation[];
  className?: string;
}

export default function DocumentViewer({ citations, className }: DocumentViewerProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  // Group citations by source
  const citationsBySource = citations.reduce((acc, citation) => {
    const source = citation.source;
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push(citation);
    return acc;
  }, {} as Record<string, Citation[]>);

  // Sort sources by average relevance score
  const sortedSources = Object.entries(citationsBySource).sort(([, a], [, b]) => {
    const avgA = a.reduce((sum, c) => sum + c.relevance_score, 0) / a.length;
    const avgB = b.reduce((sum, c) => sum + c.relevance_score, 0) / b.length;
    return avgB - avgA;
  });

  const toggleChunkExpansion = (chunkId: string) => {
    setExpandedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-matrix-green/20 border-matrix-green';
    if (score >= 0.6) return 'bg-matrix-cyan/20 border-matrix-cyan';
    return 'bg-glass-bg border-glass-border';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  if (citations.length === 0) {
    return (
      <GlassPanel className={clsx('p-4', className)}>
        <p className="text-sm text-matrix-white/60 text-center">
          No document sources available
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Source selector */}
      <GlassPanel className="p-4">
        <h3 className="text-sm font-mono text-matrix-green mb-3">Document Sources</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSource(null)}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-mono transition-all duration-200',
              selectedSource === null
                ? 'bg-matrix-green text-matrix-black'
                : 'bg-glass-bg border border-glass-border text-matrix-white/60 hover:text-matrix-green hover:border-matrix-green'
            )}
          >
            All Sources ({citations.length})
          </button>
          {sortedSources.map(([source, sourceCitations]) => (
            <button
              key={source}
              onClick={() => setSelectedSource(source)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-mono transition-all duration-200',
                selectedSource === source
                  ? 'bg-matrix-green text-matrix-black'
                  : 'bg-glass-bg border border-glass-border text-matrix-white/60 hover:text-matrix-green hover:border-matrix-green'
              )}
              title={`${sourceCitations.length} citation${sourceCitations.length > 1 ? 's' : ''}`}
            >
              {source} ({sourceCitations.length})
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Document chunks */}
      <div className="space-y-3">
        {sortedSources
          .filter(([source]) => selectedSource === null || source === selectedSource)
          .map(([source, sourceCitations]) => (
            <GlassPanel key={source} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-sm font-mono text-matrix-green">
                  {source}
                </h4>
                <span className="text-xs text-matrix-white/60">
                  {sourceCitations.length} chunk{sourceCitations.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {sourceCitations
                  .sort((a, b) => b.relevance_score - a.relevance_score)
                  .map((citation, idx) => {
                    const chunkId = citation.chunk_id || `${source}-${idx}`;
                    const isExpanded = expandedChunks.has(chunkId);
                    const relevancePercent = Math.round(citation.relevance_score * 100);

                    return (
                      <div
                        key={chunkId}
                        className={clsx(
                          'rounded-lg border p-3 transition-all duration-200',
                          getRelevanceColor(citation.relevance_score)
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {citation.page && (
                              <span className="text-xs text-matrix-white/60">
                                Page {citation.page}
                              </span>
                            )}
                            {citation.chunk_id && (
                              <span className="text-xs text-matrix-white/40 font-mono">
                                #{citation.chunk_id}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={clsx(
                              'text-xs font-mono px-2 py-0.5 rounded',
                              citation.relevance_score >= 0.8
                                ? 'bg-matrix-green/30 text-matrix-green'
                                : citation.relevance_score >= 0.6
                                ? 'bg-matrix-cyan/30 text-matrix-cyan'
                                : 'bg-glass-bg text-matrix-white/60'
                            )}>
                              {relevancePercent}% • {getRelevanceLabel(citation.relevance_score)}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-matrix-white/80 leading-relaxed">
                          <p className={clsx(!isExpanded && 'line-clamp-3')}>
                            {citation.text_preview}
                          </p>
                          {citation.text_preview.length > 150 && (
                            <button
                              onClick={() => toggleChunkExpansion(chunkId)}
                              className="mt-1 text-xs text-matrix-green hover:text-matrix-cyan transition-colors"
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>

                        {/* Metadata */}
                        {citation.metadata && Object.keys(citation.metadata).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-glass-border/50">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(citation.metadata).map(([key, value]) => (
                                <span key={key} className="text-xs text-matrix-white/40">
                                  <span className="text-matrix-white/60">{key}:</span> {String(value)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </GlassPanel>
          ))}
      </div>
    </div>
  );
}