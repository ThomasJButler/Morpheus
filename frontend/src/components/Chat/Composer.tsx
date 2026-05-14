'use client';

import { forwardRef, useEffect, useRef, ChangeEventHandler, FormEvent } from 'react';
import type { RAGMode } from '@/lib/types';

export interface ComposerProps {
  input: string;
  handleInputChange: ChangeEventHandler<HTMLTextAreaElement>;
  handleSubmit: (e?: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  maxLength?: number;
  placeholder?: string;
  mode?: RAGMode;
  onOpenSettings?: () => void;
}

const MAX_LENGTH_DEFAULT = 2000;
const WARN_AT = 1800;
const ERROR_AT = 1950;

const MODE_LABEL: Record<RAGMode, { label: string; tone: string }> = {
  simple:  { label: 'Simple',  tone: 'text-accent' },
  hybrid:  { label: 'Hybrid',  tone: 'text-mode-amber' },
  agentic: { label: 'Agentic', tone: 'text-mode-cyan' },
  auto:    { label: 'Auto',    tone: 'text-mode-purple' },
};

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    maxLength = MAX_LENGTH_DEFAULT,
    placeholder = 'Ask about your documents…',
    mode,
    onOpenSettings,
  },
  ref,
) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef;

  // Auto-grow the textarea up to ~120px, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input, textareaRef]);

  const overLimit = input.length > maxLength;
  const overWarn = input.length > WARN_AT;
  const overError = input.length > ERROR_AT;
  const canSend = input.trim().length > 0 && !isLoading && !overLimit;

  const counterTone =
    overError ? 'text-mode-red' : overWarn ? 'text-mode-amber' : 'text-fg-faint';

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSubmit();
    }
  };

  const modeMeta = mode ? MODE_LABEL[mode] : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) handleSubmit(e);
      }}
      className="flex-shrink-0 flex flex-col gap-2 pt-3"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="
          flex items-end gap-2 p-2
          bg-surface-input border border-edge-default
          rounded-v2-md
          focus-within:border-edge-focus
          focus-within:shadow-glow-sm
          transition-colors
        "
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={maxLength + 50}
          disabled={isLoading}
          aria-label="Chat input"
          className="
            flex-1 resize-none bg-transparent outline-none
            font-geist text-[14px] leading-relaxed text-fg-primary placeholder:text-fg-muted/70
            min-h-[28px] max-h-[120px] py-1.5 px-1
            disabled:opacity-60
          "
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="
            flex-shrink-0 inline-flex items-center justify-center gap-2
            h-9 min-w-[64px] px-3
            font-mono text-xs font-bold uppercase tracking-wider
            bg-accent text-[#051005]
            rounded-v2-sm
            hover:bg-accent-bright hover:shadow-glow-md
            active:scale-[0.98]
            transition-all
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent disabled:hover:shadow-none
          "
        >
          <svg className="w-3.5 h-3.5 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-[11px] font-mono">
        <div className="flex items-center gap-2 text-fg-faint flex-wrap">
          {modeMeta && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`
                inline-flex items-center gap-1 px-2.5 min-h-[32px] sm:min-h-[28px]
                rounded-full border border-edge-subtle
                ${modeMeta.tone}
                hover:border-edge-default hover:bg-surface-card-hover
                transition-colors
              `}
              title="Change retrieval mode in Settings"
              aria-label={`Retrieval mode: ${modeMeta.label}. Click to open Settings.`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
              {modeMeta.label}
            </button>
          )}
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-edge-subtle bg-surface-card text-fg-secondary">⌘K</kbd>
            <span>focus</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-edge-subtle bg-surface-card text-fg-secondary">⏎</kbd>
            <span>send</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-edge-subtle bg-surface-card text-fg-secondary">⇧⏎</kbd>
            <span>new line</span>
          </span>
        </div>

        <span className={`tabular-nums ${counterTone}`}>
          {input.length}/{maxLength}
          {overWarn && <span className="ml-1" aria-hidden>⚠</span>}
        </span>
      </div>
    </form>
  );
});

export default Composer;
