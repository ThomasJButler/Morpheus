'use client';

import { useRef, TouchEvent } from 'react';

interface SwipeOptions {
  /** Which direction's swipe should trigger close. */
  direction: 'left' | 'right';
  /** Minimum horizontal travel (px) before the swipe counts. */
  threshold?: number;
  /** Maximum vertical drift (px) allowed; beyond this we treat it as a scroll. */
  verticalTolerance?: number;
  /** Called when the swipe completes in the closing direction past the threshold. */
  onClose: () => void;
  /** Whether the hook is active. Pass `false` to make the handlers no-ops (e.g. drawer is closed). */
  enabled: boolean;
}

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: TouchEvent<HTMLElement>) => void;
  onTouchEnd: (e: TouchEvent<HTMLElement>) => void;
}

/**
 * Single-finger horizontal swipe gesture detector for closing a drawer.
 * Tracks touchstart → touchmove → touchend; if the user travelled ≥threshold
 * in the closing direction with predominantly horizontal motion, fires
 * `onClose`. No animation here — the parent's CSS transition handles
 * snap-back when the swipe doesn't meet the threshold.
 */
export function useSwipeToClose({
  direction,
  threshold = 80,
  verticalTolerance = 40,
  onClose,
  enabled,
}: SwipeOptions): SwipeHandlers {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const reset = () => {
    startX.current = null;
    startY.current = null;
  };

  return {
    onTouchStart: (e) => {
      if (!enabled) return;
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
    },
    onTouchMove: () => {
      // No-op: tracking on end is sufficient for a single-shot swipe. If we
      // wanted live-track translateX for finger-follows-drawer feel, we'd add
      // it here; intentionally keeping it simple.
    },
    onTouchEnd: (e) => {
      if (!enabled || startX.current === null || startY.current === null) {
        reset();
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = Math.abs(t.clientY - startY.current);
      reset();

      if (dy > verticalTolerance) return; // Vertical scroll, not a swipe
      if (direction === 'left' && dx <= -threshold) onClose();
      if (direction === 'right' && dx >= threshold) onClose();
    },
  };
}
