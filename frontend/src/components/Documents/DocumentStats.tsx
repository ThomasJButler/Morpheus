'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DocumentStats as DocumentStatsType } from '@/lib/types';
import GlassPanel from '../UI/GlassPanel';
import LoadingPulse from '../UI/LoadingPulse';

interface DocumentStatsProps {
  refreshTrigger?: number;
}

export default function DocumentStats({ refreshTrigger = 0 }: DocumentStatsProps) {
  const [stats, setStats] = useState<DocumentStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getDocumentStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <GlassPanel className="p-3">
        <LoadingPulse text="LOADING..." />
      </GlassPanel>
    );
  }

  if (error) {
    return (
      <GlassPanel className="p-3">
        <div className="text-red-400 text-xs font-mono">
          [ERR] {error}
        </div>
      </GlassPanel>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <GlassPanel className="p-3">
      {/* Retro Terminal Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-matrix-green/20">
        <div className="flex items-center gap-2">
          <span className="text-matrix-green font-mono text-xs">&gt;_</span>
          <span className="text-matrix-white/80 font-mono text-xs uppercase tracking-wider">
            INDEX STATUS
          </span>
        </div>
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="text-matrix-green/60 hover:text-matrix-green disabled:opacity-50
                     transition-colors duration-200"
          title="Refresh"
        >
          <svg
            className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Compact Stats Grid - Retro Terminal Style */}
      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[DOC]</span>
          <span className="text-matrix-green tabular-nums">{stats.total_documents}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[CHK]</span>
          <span className="text-matrix-cyan tabular-nums">{stats.total_chunks}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[VEC]</span>
          <span className="text-matrix-white/80 tabular-nums">{stats.total_embeddings}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[SIZ]</span>
          <span className="text-matrix-white/80 tabular-nums">{stats.index_size}</span>
        </div>
      </div>

      {/* Timestamp - minimal */}
      {stats.last_updated && (
        <div className="text-[10px] text-matrix-white/20 font-mono text-right mt-2 pt-2 border-t border-matrix-green/10">
          {new Date(stats.last_updated).toLocaleTimeString()}
        </div>
      )}
    </GlassPanel>
  );
}
