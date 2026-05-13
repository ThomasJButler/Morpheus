'use client';

interface DocItemProps {
  filename: string;
  index: number;
}

/**
 * Single row in the DocsSidebar list. Static (no click handler in Phase 4 —
 * per-doc filtering isn't wired anywhere yet; per-doc delete isn't supported
 * by the API at `apiClient.listDocuments`). The remove button + select
 * handler land in a later phase when the backend or UX needs them.
 */
export default function DocItem({ filename, index }: DocItemProps) {
  const ext = filename.split('.').pop()?.toLowerCase() || 'doc';
  const ordinal = String(index).padStart(2, '0');

  return (
    <li
      className="
        flex items-center gap-2.5 px-2 py-2
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
          title={filename}
        >
          {filename}
        </div>
        <div className="font-mono text-[10px] text-fg-faint mt-0.5">
          [{ordinal}]
        </div>
      </div>
    </li>
  );
}
