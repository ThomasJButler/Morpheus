'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useBackendHealth } from '@/lib/hooks/useBackendHealth';
import DocumentUploader from '../Documents/DocumentUploader';
import DocItem from './DocItem';

/**
 * Custom event dispatched by DocumentUploader.tsx on successful upload.
 * Multiple v2 consumers (this sidebar + the future System panel Sources tab)
 * subscribe so they stay in sync without lifting state to AppShell or
 * adding a context provider. Add new listeners with addEventListener.
 */
const REFRESH_EVENT = 'morpheus:documents-changed';

/**
 * v2 left rail — replaces the Phase 1 docs-rail placeholder in Body.tsx.
 * Self-contained: owns its own fetch via apiClient.listDocuments() and its
 * own upload-modal state. The DocumentUploader modal is reused as-is
 * (Phase 6 restyles it). Header "Toggle constructs" wires up in Phase 7
 * alongside the mobile drawer pattern.
 */
export default function DocsSidebar() {
  const health = useBackendHealth();
  const [docs, setDocs] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  const fetchDocs = useCallback(async () => {
    setError(null);
    try {
      const res = await apiClient.listDocuments();
      setDocs(res.documents ?? []);
      setCount(res.count ?? 0);
      setTotalChunks(res.total_chunks ?? 0);
    } catch (err) {
      setDocs([]);
      setCount(0);
      setTotalChunks(0);
      // Only surface errors once the backend reports ready. While warming,
      // `apiClient.listDocuments` will throw `'Failed to fetch document list'`
      // (or similar) and the ColdStart strip already explains why — showing
      // an inline error here would be redundant noise. Once ready, real
      // 4xx/5xx responses *do* deserve to be surfaced rather than masked as
      // empty state, so we drop the previous regex-on-message filter.
      if (health.status === 'ready' && err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [health.status]);

  useEffect(() => {
    fetchDocs();
    const handler = () => fetchDocs();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [fetchDocs]);

  return (
    <aside className="docs-rail" aria-label="Constructs (documents)">
      <header className="flex items-center justify-between gap-2 px-3 py-3 border-b border-edge-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <FolderIcon />
          <span className="font-mono text-[11px] tracking-[0.2em] text-fg-muted">
            CONSTRUCTS
          </span>
          <span className="font-mono text-[11px] text-fg-faint">·</span>
          <span className="font-mono text-[11px] text-fg-secondary tabular-nums">
            {count}
          </span>
        </div>
      </header>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => setIsUploaderOpen(true)}
          className="
            w-full flex flex-col items-start gap-1
            px-3 py-2.5 rounded-v2-md
            border border-edge-default bg-surface-card
            hover:bg-surface-card-hover hover:border-edge-strong hover:shadow-glow-sm
            transition-colors
            text-left
          "
        >
          <span className="flex items-center gap-2 text-fg-primary text-[13px] font-geist">
            <UploadIcon />
            Upload document
          </span>
          <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.12em]">
            PDF · DOCX · TXT · MD
          </span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2">
        {isLoading && (
          <div className="px-2 py-1 font-mono text-[11px] text-fg-faint">
            Loading constructs…
          </div>
        )}

        {error && !isLoading && (
          <div className="px-2 py-2 rounded-v2-sm border border-mode-red/30 bg-mode-red/5 font-mono text-[11px] text-mode-red">
            {error}
          </div>
        )}

        {!isLoading && !error && docs.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <span
              aria-hidden
              className="w-9 h-9 rounded-v2-md border border-edge-subtle inline-flex items-center justify-center text-fg-muted"
            >
              <FilePlusIcon />
            </span>
            <p className="m-0 font-mono text-[11.5px] text-fg-muted">
              The construct is empty.
            </p>
            <p className="m-0 text-[11px] text-fg-faint">
              Upload a document to begin.
            </p>
          </div>
        )}

        {!isLoading && !error && docs.length > 0 && (
          <ul className="space-y-1">
            {docs.map((name, i) => (
              <DocItem key={name} filename={name} index={i + 1} />
            ))}
          </ul>
        )}
      </div>

      <footer className="px-3 py-2.5 border-t border-edge-subtle">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
          INDEX · {totalChunks} CHUNKS · {count} DOCS
        </div>
      </footer>

      {/* Reused legacy upload modal. Phase 6 restyles with the new Modal shell.
          DocumentUploader dispatches the morpheus:documents-changed event on
          success — our listener above catches it and refetches. */}
      {isUploaderOpen && (
        <DocumentUploader
          onClose={() => setIsUploaderOpen(false)}
          onUploadComplete={() => {
            /* No-op: refresh is driven by the global event so the legacy
               UploadButton in ChatInterface also keeps the sidebar in sync. */
          }}
        />
      )}
    </aside>
  );
}

function FolderIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-fg-muted shrink-0"
      aria-hidden
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FilePlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}
