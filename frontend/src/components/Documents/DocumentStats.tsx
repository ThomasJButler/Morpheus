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
      <GlassPanel className="p-4">
        <LoadingPulse text="Loading document stats" />
      </GlassPanel>
    );
  }

  if (error) {
    return (
      <GlassPanel className="p-4">
        <div className="text-red-400 text-sm">
          {error}
        </div>
      </GlassPanel>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <GlassPanel className="p-6">
      {/* Header with inline refresh */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="section-header mb-0">
          Document Statistics
        </h3>
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-matrix-green
                     border border-matrix-green/30 rounded-md
                     hover:bg-matrix-green/10 hover:border-matrix-green/50
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 group"
          title="Refresh statistics"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card group">
          <div className="stat-card-value text-matrix-green">
            <span className="text-2xl mr-2 opacity-70">📄</span>
            <span className="tabular-nums">{stats.total_documents}</span>
          </div>
          <div className="stat-card-label">Documents</div>
        </div>

        <div className="stat-card group">
          <div className="stat-card-value text-matrix-cyan">
            <span className="text-2xl mr-2 opacity-70">🧩</span>
            <span className="tabular-nums">{stats.total_chunks}</span>
          </div>
          <div className="stat-card-label">Chunks</div>
        </div>

        <div className="stat-card group">
          <div className="stat-card-value text-matrix-white">
            <span className="text-2xl mr-2 opacity-70">🎯</span>
            <span className="tabular-nums">{stats.total_embeddings}</span>
          </div>
          <div className="stat-card-label">Embeddings</div>
        </div>

        <div className="stat-card group">
          <div className="stat-card-value text-matrix-white">
            <span className="text-2xl mr-2 opacity-70">💾</span>
            <span className="text-base tabular-nums">{stats.index_size}</span>
          </div>
          <div className="stat-card-label">Index Size</div>
        </div>
      </div>

      {/* Timestamp */}
      {stats.last_updated && (
        <div className="text-xs text-matrix-white/30 font-mono text-center pt-2 border-t border-matrix-green/10">
          Updated {new Date(stats.last_updated).toLocaleTimeString()}
        </div>
      )}
    </GlassPanel>
  );
}