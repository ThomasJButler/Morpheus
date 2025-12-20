'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  messageCount?: number;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  messageCount,
}: ConfirmDialogProps) {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md glass-panel p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2
          id="confirm-dialog-title"
          className="text-lg font-mono font-bold text-matrix-green"
        >
          {title}
        </h2>

        {/* Message */}
        <div className="space-y-2">
          <p className="text-sm text-matrix-white/90">{message}</p>
          {messageCount !== undefined && messageCount > 0 && (
            <p className="text-xs text-matrix-white/60">
              {messageCount} message{messageCount !== 1 ? 's' : ''} will be lost
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-md font-mono text-sm
                       bg-matrix-black/60 border border-matrix-white/20 text-matrix-white
                       hover:bg-matrix-black/80 hover:border-matrix-white/40
                       active:scale-95
                       transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-md font-mono text-sm font-bold
                       active:scale-95
                       transition-all duration-200
                       ${
                         confirmVariant === 'danger'
                           ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500/70'
                           : 'bg-matrix-green text-matrix-black hover:bg-matrix-cyan'
                       }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
