'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useBackendHealth } from '@/lib/hooks/useBackendHealth';
import type { DocumentStats, EnhancedRetrievalMetrics, RAGMode } from '@/lib/types';

interface StatusTabProps {
  metrics?: EnhancedRetrievalMetrics;
  modeUsed?: RAGMode;
}

const MODE_COLOR: Record<RAGMode, string> = {
  simple: 'text-accent',
  hybrid: 'text-mode-amber',
  agentic: 'text-mode-cyan',
  auto: 'text-mode-purple',
};

const REFRESH_EVENT = 'morpheus:documents-changed';

export default function StatusTab({ metrics, modeUsed }: StatusTabProps) {
  const health = useBackendHealth();
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const data = await apiClient.getDocumentStats();
      setStats(data);
      setLastSync(new Date());
    } catch (err) {
      setStats(null);
      if (health.status === 'ready' && err instanceof Error) {
        setError(err.message);
      }
    }
  }, [health.status]);

  useEffect(() => {
    fetchStats();
    const handler = () => fetchStats();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [fetchStats]);

  return (
    <div className="flex flex-col gap-4">
      <Section
        title=">_ INDEX STATUS"
        action={
          <button
            type="button"
            onClick={fetchStats}
            aria-label="Refresh index status"
            title="Refresh"
            className="inline-flex items-center justify-center w-6 h-6 rounded-v2-sm text-fg-muted hover:text-fg-primary hover:bg-surface-card-hover transition-colors"
          >
            <IconRefresh />
          </button>
        }
      >
        {error ? (
          <p className="font-mono text-[11px] text-mode-red">{error}</p>
        ) : (
          <>
            <StatRow label="DOC" value={stats?.total_documents ?? '—'} accent />
            <StatRow label="CHK" value={stats?.total_chunks ?? '—'} accent />
            <StatRow label="VEC" value={stats?.total_embeddings ?? '—'} />
            <StatRow label="SIZ" value={stats?.index_size ?? '—'} />
            {lastSync && (
              <p className="mt-1.5 font-mono text-[10px] text-fg-faint">
                last sync · {lastSync.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </Section>

      <Section title=">_ LAST QUERY">
        {metrics ? (
          <>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-fg-muted">[MODE]</span>
              <span className={`${MODE_COLOR[modeUsed ?? 'auto']} uppercase`}>
                {modeUsed ?? 'auto'}
              </span>
            </div>
            {metrics.mode_confidence != null && (
              <StatRow
                label="CONF"
                value={`${Math.round(metrics.mode_confidence * 100)}%`}
              />
            )}
            <StatRow label="TIME" value={`${metrics.query_time_ms}ms`} />
            <StatRow label="HITS" value={metrics.num_results} />
            {metrics.tool_calls_made > 0 && (
              <StatRow label="TOOL" value={metrics.tool_calls_made} accent />
            )}
            {metrics.reranked && (
              <p className="mt-1.5 font-mono text-[11px] text-accent inline-flex items-center gap-1.5">
                <IconCheck /> Reranked for precision
              </p>
            )}
            {metrics.escalated_from && (
              <p className="mt-1.5 font-mono text-[11px] text-mode-amber">
                Escalated from {metrics.escalated_from.toUpperCase()}
                {metrics.escalation_reason && (
                  <span className="block text-fg-muted normal-case mt-0.5">
                    {metrics.escalation_reason}
                  </span>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="font-mono text-[11px] text-fg-faint">
            Run a query to see retrieval metrics here.
          </p>
        )}
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, action, children }: SectionProps) {
  return (
    <section>
      <header className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] tracking-[0.15em] text-fg-secondary">
          {title}
        </span>
        {action}
      </header>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

interface StatRowProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatRow({ label, value, accent }: StatRowProps) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="text-fg-muted">[{label}]</span>
      <span className={`tabular-nums ${accent ? 'text-accent' : 'text-fg-secondary'}`}>
        {value}
      </span>
    </div>
  );
}

function IconRefresh() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
