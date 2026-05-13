'use client';

interface ThinkingInputStateProps {
  text?: string;
}

/**
 * Calm v2 "thinking" indicator shown in place of the composer while the
 * assistant is streaming a response. The previous implementation used a
 * typewriter effect that flashed a leading "M" every loop (user-reported
 * glitch); this drops the typewriter entirely in favour of three pulsing
 * accent dots and a static label. ARIA `role="status"` + `aria-live="polite"`
 * announces the change to screen readers.
 */
export default function ThinkingInputState({
  text = 'Morpheus is thinking…',
}: ThinkingInputStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text}
      className="
        flex items-center gap-3 min-h-[44px]
        px-3 py-2.5 rounded-v2-md
        border border-edge-default bg-surface-input
      "
    >
      <span className="thinking-dots inline-flex items-center gap-1" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="font-mono text-[13px] text-fg-secondary">{text}</span>
    </div>
  );
}
