'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  /** Optional icon shown next to the title in the header. */
  icon?: ReactNode;
  /** Optional footer row (action buttons etc.). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * v2 shared modal shell — used by Settings, DocumentUploader, QuickStartGuide.
 *
 * Provides:
 * - Backdrop + dialog rendered via React portal (escapes z-index quirks
 *   from nested stacking contexts).
 * - Escape-to-close, backdrop-click-to-close.
 * - Focus trap: Tab cycles inside the modal, Shift-Tab cycles in reverse,
 *   first focusable element receives focus on open, original trigger
 *   regains focus on close.
 * - ARIA `role="dialog"` + `aria-modal="true"` + `aria-labelledby` wired
 *   to the title element so screen readers announce the modal properly.
 * - Locks body scroll while open (the AppShell already has overflow:hidden
 *   on v2, but we set this explicitly for safety in legacy / SSR contexts).
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  icon,
  footer,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(
    `modal-title-${Math.random().toString(36).slice(2, 9)}`,
  );
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Portal target only resolves on the client.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key handler.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Focus management — remember the previously focused element, move focus
  // into the modal on open, restore on close.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    // Defer until the dialog is in the DOM and visible.
    const id = window.requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        FOCUSABLE_SELECTOR,
      );
      if (first) first.focus();
      else dialogRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR,
      );
      if (!focusable || focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="
        fixed inset-0 z-[60] flex items-center justify-center
        p-4 sm:p-6
        bg-surface-overlay backdrop-blur-sm
        animate-fade-in
      "
      onClick={(e) => {
        // Click on the backdrop (this div, not the dialog) closes.
        // The backdrop styling lives on this same element rather than a
        // sibling div so e.target === e.currentTarget actually matches.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`
          relative w-full ${SIZE_CLASS[size]}
          max-h-[90vh] flex flex-col
          rounded-v2-lg border border-edge-default bg-surface-elev
          shadow-glow-md
          slide-up-fade
          outline-none
        `}
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-edge-subtle shrink-0">
          {icon && (
            <span aria-hidden className="text-accent shrink-0">
              {icon}
            </span>
          )}
          <h2
            id={titleId.current}
            className="flex-1 font-mono text-base text-fg-primary tracking-wide"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="
              inline-flex items-center justify-center w-10 h-10 rounded-v2-sm
              text-fg-muted hover:text-fg-primary hover:bg-surface-card-hover
              transition-colors
            "
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 font-geist text-fg-primary">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-edge-subtle shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
