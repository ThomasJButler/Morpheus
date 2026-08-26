'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useBackendHealth } from '@/lib/hooks/useBackendHealth';
import type { DocumentStats, DoneInfo } from '@/lib/types';

interface StatusTabProps {
  done?: DoneInfo;
}

const REFRESH_EVENT = 'morpheus:documents-changed';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StatusTab({ done }: StatusTabProps) {
  const health = useBackendHealth();
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const data = await apiClient.documentStats();
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
        title=">_ LIBRARY"
        action={
          <button
            type="button"
            onClick={fetchStats}
            aria-label="Refresh library status"
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
            <StatRow label="DOC" value={stats?.documents ?? '—'} accent />
            <StatRow label="CHK" value={stats?.chunks ?? '—'} accent />
            <StatRow label="SIZ" value={stats ? formatBytes(stats.size_bytes) : '—'} />
            {lastSync && (
              <p className="mt-1.5 font-mono text-[10px] text-fg-faint">
                last sync · {lastSync.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </Section>

      <Section title=">_ LAST ANSWER">
        {done ? (
          <>
            <StatRow label="MODE" value={`${done.mode}${done.deep ? ' · deep' : ''}`.toUpperCase()} accent />
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-fg-muted">[GRND]</span>
              <span className={done.grounded ? 'text-accent' : 'text-mode-amber'}>
                {done.grounded ? 'YES' : 'NO'}
              </span>
            </div>
            <StatRow label="CITE" value={`${done.cited}/${done.retrieved}`} />
            {done.retrieval_ms != null && <StatRow label="RETR" value={`${Math.round(done.retrieval_ms)}ms`} />}
            {done.generation_ms != null && <StatRow label="GEN" value={`${Math.round(done.generation_ms)}ms`} />}
            {done.completion_tokens != null && <StatRow label="TOK" value={`${done.prompt_tokens ?? '?'} in / ${done.completion_tokens} out`} />}
            <p className="mt-1.5 font-mono text-[10px] text-fg-faint">
              model · {done.model}
            </p>
          </>
        ) : (
          <p className="font-mono text-[11px] text-fg-faint">
            Ask a question to see retrieval facts here.
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
