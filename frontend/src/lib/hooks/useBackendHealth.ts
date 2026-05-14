'use client';

import { useEffect, useState } from 'react';

/**
 * Backend cold-start stages. Drives the ColdStart progress strip.
 * Durations match the prototype design (`morpheus/data.jsx`) and are
 * calibrated for Render's free-tier cold-start (~60s total). The current
 * stage is computed from elapsed time client-side; the moment `/api/health`
 * returns 200 we jump to `ready`, so honest "ready" is gated on real
 * backend telemetry even though intermediate stages are time-based.
 */
export interface ColdStartStage {
  id: 'wake' | 'model' | 'vectors' | 'warm' | 'ready';
  label: string;
  hint: string;
  durMs: number;
}

export const COLD_START_STAGES: ColdStartStage[] = [
  { id: 'wake',    label: 'Initialising',             hint: 'Backend cold start, ~60s on free tier',     durMs: 18_000 },
  { id: 'model',   label: 'Loading model weights',    hint: 'Claude Sonnet 4.6 · Anthropic',             durMs: 14_000 },
  { id: 'vectors', label: 'Connecting Pinecone index', hint: 'Vector DB · embedding dimension 1536',     durMs: 16_000 },
  { id: 'warm',    label: 'Warming retrieval cache',  hint: 'Hybrid retrieval · BM25 + dense',           durMs:  8_000 },
  { id: 'ready',   label: 'The Matrix has you',       hint: 'Ready — follow the white rabbit',           durMs:  4_000 },
];

const TOTAL_DURATION_MS = COLD_START_STAGES.reduce((sum, s) => sum + s.durMs, 0);
const POLL_INTERVAL_MS = 1_500;
const FETCH_TIMEOUT_MS = 1_200;
const DEFENSIVE_TIMEOUT_MS = 60_000;

export interface BackendHealthState {
  status: 'unknown' | 'warming' | 'ready';
  stageIdx: number;
  stage: ColdStartStage;
  elapsedMs: number;
  pct: number;
}

// The final stage ("ready") is reserved for the real-ready transition —
// time-based progression caps at the second-to-last stage ("warm") to keep
// the UI honest: we never label ourselves "ready" without backend
// confirmation (or the 60s defensive timeout). pct caps at 95 while warming.
const WARMING_STAGES_END = COLD_START_STAGES.length - 1; // index past `warm`

function computeStageFromElapsed(elapsedMs: number): { stageIdx: number; pct: number } {
  let cumulative = 0;
  for (let i = 0; i < WARMING_STAGES_END; i++) {
    const next = cumulative + COLD_START_STAGES[i].durMs;
    if (elapsedMs < next) {
      const stageFrac = (elapsedMs - cumulative) / COLD_START_STAGES[i].durMs;
      const baseFrac = i / WARMING_STAGES_END;
      const slice = 1 / WARMING_STAGES_END;
      const pct = Math.min(95, Math.round((baseFrac + stageFrac * slice) * 95));
      return { stageIdx: i, pct };
    }
    cumulative = next;
  }
  // Past the last warming stage but still no real-ready — hold at warm, 95%.
  return { stageIdx: WARMING_STAGES_END - 1, pct: 95 };
}

function initialState(): BackendHealthState {
  return {
    status: 'unknown',
    stageIdx: 0,
    stage: COLD_START_STAGES[0],
    elapsedMs: 0,
    pct: 0,
  };
}

// ---- Module-level singleton: one polling loop regardless of how many
// components subscribe. AppShell uses it for the progress strip,
// ChatInterface uses it for the message queue.
let current: BackendHealthState = initialState();
const listeners = new Set<(state: BackendHealthState) => void>();
let pollingHandle: ReturnType<typeof setInterval> | null = null;
let tickHandle: ReturnType<typeof setInterval> | null = null;
let startMs: number | null = null;

function notify() {
  listeners.forEach((l) => l(current));
}

async function probe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return false;
    // Validate body shape — when the backend is actually up, /api/health
    // returns `{ status: "healthy" | "unhealthy", pinecone_connected, ... }`.
    // A Next.js dev fallback or empty-body response from a dead rewrite
    // target won't match this contract, so we treat it as still warming.
    const body = await res.json().catch(() => null);
    return typeof body === 'object' && body !== null && typeof (body as { status?: unknown }).status === 'string';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function stopPolling() {
  if (pollingHandle) { clearInterval(pollingHandle); pollingHandle = null; }
  if (tickHandle)    { clearInterval(tickHandle);    tickHandle    = null; }
}

function transitionToReady(reason: 'probe' | 'timeout') {
  if (current.status === 'ready') return;
  if (reason === 'timeout') {
    // eslint-disable-next-line no-console
    console.warn('[useBackendHealth] stage timeout (60s) — assuming ready');
  }
  current = {
    status: 'ready',
    stageIdx: COLD_START_STAGES.length - 1,
    stage: COLD_START_STAGES[COLD_START_STAGES.length - 1],
    elapsedMs: startMs ? performance.now() - startMs : TOTAL_DURATION_MS,
    pct: 100,
  };
  notify();
  stopPolling();
}

function startPolling() {
  if (pollingHandle || tickHandle) return;
  startMs = performance.now();

  // Tick: update elapsed/stage/pct ~10×/s while warming. Cheap.
  tickHandle = setInterval(() => {
    if (current.status === 'ready' || startMs == null) return;
    const elapsedMs = performance.now() - startMs;

    if (elapsedMs >= DEFENSIVE_TIMEOUT_MS) {
      transitionToReady('timeout');
      return;
    }

    const { stageIdx, pct } = computeStageFromElapsed(elapsedMs);
    current = {
      status: 'warming',
      stageIdx,
      stage: COLD_START_STAGES[stageIdx],
      elapsedMs,
      pct,
    };
    notify();
  }, 100);

  // Probe: hit /api/health periodically; first success flips to ready.
  const runProbe = async () => {
    const ok = await probe();
    if (ok) transitionToReady('probe');
  };
  runProbe();
  pollingHandle = setInterval(runProbe, POLL_INTERVAL_MS);
}

export function useBackendHealth(): BackendHealthState {
  const [state, setState] = useState<BackendHealthState>(current);

  useEffect(() => {
    listeners.add(setState);
    startPolling();
    setState(current);
    return () => {
      listeners.delete(setState);
      // We intentionally do NOT stop polling on unmount — the singleton
      // serves both the strip and the queue, and one of them may remount.
    };
  }, []);

  return state;
}

// Test/dev escape hatch: reset module state. Not used in production.
export function __resetBackendHealthForTests() {
  current = initialState();
  listeners.clear();
  stopPolling();
  startMs = null;
}
