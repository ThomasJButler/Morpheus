'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import type { RAGMode, EnhancedRetrievalMetrics, QueryAnalysis, Citation } from '@/lib/types';
import StatusTab from './StatusTab';
import SourcesTab from './SourcesTab';
import SystemTab from './SystemTab';

/**
 * v2 right rail — replaces the Phase 1 sys-rail placeholder in Body.tsx.
 * Tabbed nav: Status / Sources / System. Tab state syncs to the URL via
 * `?panel=status|sources|system` for shareable deep-links.
 *
 * Cross-component data flow:
 *  - StatusTab fetches its own index stats via `apiClient.getDocumentStats()`
 *    and listens for the `morpheus:documents-changed` event from Phase 4.
 *  - Last-query metrics and citations arrive via the `morpheus:metrics-updated`
 *    CustomEvent dispatched from ChatInterface whenever ragMetadata changes.
 *    Same pattern as Phase 4 (decouples the rail from chat state without a
 *    context provider or state lifting).
 *  - SystemTab consumes useBackendHealth + useSession + useSettings directly.
 */

export type SystemPanelTab = 'status' | 'sources' | 'system';

export interface MetricsSnapshot {
  metrics?: EnhancedRetrievalMetrics;
  modeUsed?: RAGMode;
  analysis?: QueryAnalysis;
  citations: Citation[];
}

const METRICS_EVENT = 'morpheus:metrics-updated';
const VALID_TABS: SystemPanelTab[] = ['status', 'sources', 'system'];
const DEFAULT_TAB: SystemPanelTab = 'status';
const FRESHNESS_GLOW_MS = 600;

function isValidTab(value: string | null): value is SystemPanelTab {
  return !!value && (VALID_TABS as string[]).includes(value);
}

export default function SystemPanel() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const urlTab = searchParams?.get('panel') ?? null;
  const initialTab: SystemPanelTab = isValidTab(urlTab) ? urlTab : DEFAULT_TAB;
  const [tab, setTab] = useState<SystemPanelTab>(initialTab);

  // Keep state in sync if the URL changes externally (back/forward navigation).
  // When the panel param is absent or invalid (e.g. back-nav from
  // `?panel=sources` to `/`), fall back to DEFAULT_TAB rather than bailing —
  // otherwise the rendered tab desyncs from what the URL is advertising.
  useEffect(() => {
    const next: SystemPanelTab = isValidTab(urlTab) ? urlTab : DEFAULT_TAB;
    if (next !== tab) setTab(next);
  }, [urlTab, tab]);

  const selectTab = useCallback(
    (next: SystemPanelTab) => {
      setTab(next);
      const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      if (next === DEFAULT_TAB) params.delete('panel');
      else params.set('panel', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Metrics + citations come from ChatInterface via CustomEvent.
  const [snapshot, setSnapshot] = useState<MetricsSnapshot>({ citations: [] });
  const [sourcesGlow, setSourcesGlow] = useState(false);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<MetricsSnapshot>).detail;
      if (!detail) return;
      setSnapshot(detail);
      if (detail.citations.length > 0) {
        setSourcesGlow(true);
        if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
        glowTimerRef.current = setTimeout(() => setSourcesGlow(false), FRESHNESS_GLOW_MS);
      }
    };
    window.addEventListener(METRICS_EVENT, handler);
    return () => {
      window.removeEventListener(METRICS_EVENT, handler);
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  return (
    <aside className="sys-rail" aria-label="System panel">
      <nav
        role="tablist"
        aria-label="System panel tabs"
        className="flex items-center gap-1 px-2 py-2 border-b border-edge-subtle"
      >
        <TabButton
          icon={<IconActivity />}
          label="Status"
          active={tab === 'status'}
          onClick={() => selectTab('status')}
        />
        <TabButton
          icon={<IconQuote />}
          label="Sources"
          active={tab === 'sources'}
          glow={sourcesGlow && tab !== 'sources'}
          onClick={() => selectTab('sources')}
        />
        <TabButton
          icon={<IconCpu />}
          label="System"
          active={tab === 'system'}
          onClick={() => selectTab('system')}
        />
      </nav>

      <div
        className={`
          flex-1 min-h-0 overflow-y-auto p-3
          transition-shadow duration-300
          ${sourcesGlow && tab === 'sources' ? 'shadow-glow-md' : ''}
        `}
        role="tabpanel"
        aria-label={`${tab} content`}
      >
        {tab === 'status' && (
          <StatusTab metrics={snapshot.metrics} modeUsed={snapshot.modeUsed} />
        )}
        {tab === 'sources' && <SourcesTab citations={snapshot.citations} />}
        {tab === 'system' && <SystemTab modeUsed={snapshot.modeUsed} />}
      </div>
    </aside>
  );
}

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  glow?: boolean;
  onClick: () => void;
}

function TabButton({ icon, label, active, glow, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1.5 rounded-v2-sm
        font-mono text-[11px] tracking-wide
        transition-colors
        ${active
          ? 'bg-surface-card text-accent border border-edge-default'
          : 'text-fg-muted border border-transparent hover:bg-surface-card-hover hover:text-fg-primary'}
        ${glow ? 'animate-pulse ring-1 ring-accent/40' : ''}
      `}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}

function IconActivity() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h2c0 4-1 5-3 5z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h2c0 4-1 5-3 5z" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </svg>
  );
}
