'use client';

import { useEffect, RefObject } from 'react';

/**
 * Adds an `is-scrolling` class to the element while the user is actively
 * scrolling it, removing it 1 second after the last scroll event. Pair with
 * CSS rules on `.scrollbar-matrix.is-scrolling::-webkit-scrollbar-thumb`
 * (and `:hover` on desktop) to fade the scrollbar in/out — see globals.css.
 *
 * Why a class rather than animating opacity in JS: CSS transitions handle
 * the fade, the JS just owns the state. Cheap, no per-frame work.
 *
 * Touch-device behaviour: there's no `:hover`, so the bar is only visible
 * during scroll. That matches native iOS/Android overlay-scrollbar feel.
 */
export function useAutoHideScrollbar(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timeoutId: number | undefined;
    const onScroll = () => {
      el.classList.add('is-scrolling');
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        el.classList.remove('is-scrolling');
      }, 1000);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [ref]);
}
