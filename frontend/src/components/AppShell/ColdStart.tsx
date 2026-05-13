'use client';

import { useEffect, useState } from 'react';
import { useBackendHealth, COLD_START_STAGES } from '@/lib/hooks/useBackendHealth';

const SEEN_KEY = 'morpheus.coldStart.seen';
const APPEAR_DELAY_MS = 1500;  // don't show if backend is already warm
const FADE_OUT_MS = 600;       // brief "Ready" display before dismissing

/**
 * Cold-start progress strip — overlays the AppShell while the backend
 * warms (~60s on Render free tier). Time-based stage progression is the
 * client-side illusion; the flip to `ready` is gated on a real
 * `/api/health` 200 (or a 60s defensive timeout).
 *
 * Behavior:
 * - First visit + warming: full strip appears after 1.5s, collapsible to
 *   a mini bar or expanded with stage list.
 * - Return visits (`morpheus.coldStart.seen` in localStorage): same UX
 *   but starts in mini mode. Could be slimmed further later.
 * - Backend already ready before 1.5s elapses: never appears.
 * - Transition to ready: brief 600ms "ready" pulse then fade out.
 * - Dismissable: the user can hide it (the queued-message flow still
 *   works underneath, so dismissal is purely visual).
 */
export default function ColdStart() {
  const health = useBackendHealth();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [seenBefore, setSeenBefore] = useState(false);

  // Read the localStorage flag once on mount.
  useEffect(() => {
    try {
      setSeenBefore(localStorage.getItem(SEEN_KEY) === 'true');
    } catch {
      // localStorage may be unavailable (SSR, private mode). Default to false.
    }
  }, []);

  // Decide whether to ever show the strip. We don't show if backend
  // resolves to ready inside the 1.5s grace window.
  useEffect(() => {
    if (health.status === 'ready') return;
    const t = setTimeout(() => {
      if (health.status !== 'ready') setVisible(true);
    }, APPEAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [health.status]);

  // When ready, schedule a fade-out and persist the "seen" flag for next visit.
  useEffect(() => {
    if (health.status !== 'ready') return;
    try { localStorage.setItem(SEEN_KEY, 'true'); } catch { /* noop */ }
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), FADE_OUT_MS + 800);
    return () => clearTimeout(t);
  }, [health.status, visible]);

  if (!visible || dismissed) return null;

  const isReady = health.status === 'ready';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isReady ? 'Backend ready' : `Backend ${health.stage.label.toLowerCase()}`}
      className={`
        fixed left-1/2 -translate-x-1/2 z-30
        bottom-4 sm:bottom-6
        w-[min(560px,calc(100vw-2rem))]
        rounded-v2-md border bg-surface-elev/95 backdrop-blur-sm shadow-glow-md
        font-mono text-sm
        ${isReady ? 'border-accent/60' : 'border-edge-default'}
        ${isReady ? 'animate-fade-in' : 'slide-up-fade'}
      `}
      style={{ transition: `opacity ${FADE_OUT_MS}ms ease-out` }}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span
          aria-hidden
          className={`
            relative w-2 h-2 rounded-full
            ${isReady ? 'bg-accent' : 'bg-accent/70'}
          `}
          style={{ boxShadow: '0 0 10px var(--accent)' }}
        >
          {!isReady && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'var(--accent)', opacity: 0.6 }}
              aria-hidden
            />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[12.5px] text-fg-primary truncate">
              {health.stage.label}
              {!isReady && <span className="text-fg-muted">…</span>}
            </span>
            <span className="ml-auto text-[11px] tabular-nums text-fg-muted">
              {health.pct}%
            </span>
          </div>
          <div className="mt-1.5 h-[3px] rounded-full bg-surface-input overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{
                width: `${health.pct}%`,
                background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))',
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          aria-expanded={expanded}
          className="
            inline-flex items-center justify-center w-7 h-7 rounded-v2-sm
            text-fg-muted hover:text-fg-primary hover:bg-surface-card-hover
            transition-colors
          "
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="
            inline-flex items-center justify-center w-7 h-7 rounded-v2-sm
            text-fg-muted hover:text-fg-primary hover:bg-surface-card-hover
            transition-colors
          "
        >
          <svg
            className="w-3.5 h-3.5"
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
      </div>

      {expanded && !isReady && (
        <div className="px-3 pb-3 pt-1 border-t border-edge-subtle">
          <p className="text-[11px] text-fg-muted mb-2">
            {health.stage.hint}
          </p>
          <ol className="space-y-1">
            {COLD_START_STAGES.map((s, i) => {
              const state = i < health.stageIdx ? 'done' : i === health.stageIdx ? 'active' : 'pending';
              return (
                <li
                  key={s.id}
                  className={`
                    flex items-center gap-2 text-[11.5px]
                    ${state === 'done' ? 'text-fg-secondary' : ''}
                    ${state === 'active' ? 'text-fg-primary' : ''}
                    ${state === 'pending' ? 'text-fg-faint' : ''}
                  `}
                >
                  <span className="inline-flex items-center justify-center w-3 h-3" aria-hidden>
                    {state === 'done' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-accent">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {state === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                    {state === 'pending' && <span className="w-1.5 h-1.5 rounded-full border border-edge-default" />}
                  </span>
                  <span>{s.label}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] leading-relaxed text-fg-muted">
            Backend is warming on a free Render instance. Keep configuring — your first message will send once the construct is online.
            {seenBefore && (
              <span className="block mt-1 text-fg-faint">
                You&apos;ve been here before · cold-start should be shorter next session.
              </span>
            )}
          </p>
        </div>
      )}

      {expanded && isReady && (
        <div className="px-3 pb-3 pt-1 border-t border-edge-subtle">
          <p className="text-[11px] text-accent">
            The Matrix has you — follow the white rabbit.
          </p>
        </div>
      )}
    </div>
  );
}
