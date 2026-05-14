'use client';

import type { Citation } from '@/lib/types';

interface SourcesTabProps {
  citations: Citation[];
}

/**
 * Citations from the most recent assistant response. SystemPanel's parent
 * dispatches `morpheus:metrics-updated` whenever ChatInterface receives a new
 * response; the panel re-renders us with the latest `citations` array.
 *
 * Render priority is the relevance_score (back-end already orders results
 * before sending headers; we don't re-sort to avoid surprising the user).
 */
export default function SourcesTab({ citations }: SourcesTabProps) {
  if (!citations || citations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
        <span
          aria-hidden
          className="w-9 h-9 rounded-v2-md border border-edge-subtle inline-flex items-center justify-center text-fg-muted"
        >
          <IconQuote />
        </span>
        <p className="m-0 font-mono text-[11.5px] text-fg-muted">No sources yet.</p>
        <p className="m-0 text-[11px] text-fg-faint">
          Citations from retrieved chunks appear here after a query.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.15em] text-fg-secondary">
          &gt;_ {citations.length} SOURCE{citations.length !== 1 ? 'S' : ''}
        </span>
        <span className="font-mono text-[10px] text-fg-faint">
          most recent response
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {citations.map((c, i) => (
          <SourceCard key={`${c.source}-${i}`} citation={c} index={i + 1} />
        ))}
      </ul>
    </div>
  );
}

interface SourceCardProps {
  citation: Citation;
  index: number;
}

function SourceCard({ citation, index }: SourceCardProps) {
  const ordinal = String(index).padStart(2, '0');
  const score = Math.round((citation.relevance_score ?? 0) * 100);
  const filename = citation.source;
  const ext = filename.split('.').pop()?.toLowerCase() || 'doc';

  return (
    <li className="rounded-v2-sm border border-edge-subtle bg-surface-card overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-edge-subtle">
        <span className="font-mono text-[10px] text-fg-muted">[{ordinal}]</span>
        <span
          aria-hidden
          className="font-mono text-[9px] text-fg-secondary uppercase tracking-wide px-1.5 py-0.5 rounded-[3px] border border-edge-subtle bg-surface-input"
        >
          .{ext}
        </span>
        <span className="flex-1 min-w-0 font-geist text-[12px] text-fg-primary truncate" title={filename}>
          {filename}
        </span>
        {citation.page != null && (
          <span className="font-mono text-[10px] text-fg-muted shrink-0">
            p.{citation.page}
          </span>
        )}
        <span
          className="font-mono text-[10px] tabular-nums text-accent shrink-0"
          title="Relevance score"
        >
          {score}%
        </span>
      </header>
      <blockquote className="px-3 py-2.5 border-l-2 border-mode-cyan/60 m-0 font-geist text-[12.5px] leading-relaxed text-fg-secondary italic">
        &ldquo;{citation.text_preview}&rdquo;
      </blockquote>
    </li>
  );
}

function IconQuote() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h2c0 4-1 5-3 5z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h2c0 4-1 5-3 5z" />
    </svg>
  );
}
