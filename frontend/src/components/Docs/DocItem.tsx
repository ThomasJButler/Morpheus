'use client';

import type { DocumentInfo } from '@/lib/types';

interface DocItemProps {
  doc: DocumentInfo;
  index: number;
  onDelete: (source: string) => void;
}

export default function DocItem({ doc, index, onDelete }: DocItemProps) {
  const ext = doc.source.split('.').pop()?.toLowerCase() || 'doc';
  const ordinal = String(index).padStart(2, '0');

  return (
    <li
      className="
        group flex items-center gap-2.5 px-2 py-2
        rounded-v2-sm
        hover:bg-surface-card-hover
        transition-colors
      "
    >
      <span
        aria-hidden
        className="
          shrink-0 inline-flex items-center justify-center
          w-10 h-10 rounded-v2-sm
          bg-surface-input border border-edge-subtle
          font-mono text-[10px] text-fg-secondary tracking-wide
        "
      >
        .{ext}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="font-geist text-[12.5px] text-fg-primary truncate"
          title={doc.source}
        >
          {doc.source}
        </div>
        <div className="font-mono text-[10px] text-fg-faint mt-0.5">
          [{ordinal}] · {doc.chunks} chunks{doc.pages ? ` · ${doc.pages}p` : ''}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(doc.source)}
        aria-label={`Delete ${doc.source}`}
        title="Delete from the library"
        className="
          shrink-0 inline-flex items-center justify-center
          w-8 h-8 rounded-v2-sm
          text-fg-faint opacity-60 sm:opacity-0 sm:group-hover:opacity-100
          hover:text-mode-red hover:bg-mode-red/10
          transition-all
        "
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </li>
  );
}
