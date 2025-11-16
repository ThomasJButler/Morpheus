'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DocumentStats as DocumentStatsType } from '@/lib/types';
import GlassPanel from '../UI/GlassPanel';
import LoadingPulse from '../UI/LoadingPulse';

export default function DocumentStats() {
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
  }, []);

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
    <GlassPanel className="p-4">
      <h3 className="text-sm font-mono text-matrix-green mb-4">
        Document Statistics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Documents</div>
          <div className="text-xl font-mono text-matrix-green">
            {stats.total_documents}
          </div>
        </div>

        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Chunks</div>
          <div className="text-xl font-mono text-matrix-cyan">
            {stats.total_chunks}
          </div>
        </div>

        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Embeddings</div>
          <div className="text-xl font-mono text-matrix-white">
            {stats.total_embeddings}
          </div>
        </div>

        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Index Size</div>
          <div className="text-xl font-mono text-matrix-white">
            {stats.index_size}
          </div>
        </div>
      </div>

      {stats.last_updated && (
        <div className="mt-4 pt-4 border-t border-glass-border">
          <div className="text-xs text-matrix-white/40">
            Last updated: {new Date(stats.last_updated).toLocaleString()}
          </div>
        </div>
      )}

      <button
        onClick={loadStats}
        className="mt-3 text-xs text-matrix-green hover:text-matrix-cyan transition-colors"
      >
        ↻ Refresh
      </button>
    </GlassPanel>
  );
}