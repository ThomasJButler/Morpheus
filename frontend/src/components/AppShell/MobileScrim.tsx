'use client';

interface MobileScrimProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Dim layer behind a mobile drawer. Renders below the drawer (z-40) and
 * above the body content. Click closes the drawer. Hidden via CSS above
 * the 920px breakpoint so desktop is unaffected. Pointer-events flip with
 * `is-open` so the layer doesn't intercept clicks while closed.
 */
export default function MobileScrim({ open, onClose }: MobileScrimProps) {
  return (
    <div
      aria-hidden
      className={`mobile-scrim${open ? ' is-open' : ''}`}
      onClick={onClose}
    />
  );
}
