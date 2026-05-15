'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** What the user picked (or 'system' by default). */
  theme: ThemePref;
  /** The actual applied theme after resolving 'system' against OS preference. */
  resolved: ResolvedTheme;
  setTheme: (theme: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'morpheus.theme';

function getStoredPref(): ThemePref {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system';
  } catch {
    return 'system';
  }
}

function resolvePref(pref: ThemePref): ResolvedTheme {
  if (pref !== 'system') return pref;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function applyClass(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

/**
 * Pre-hydration script — inlined into <head> by RootLayout so the correct
 * class lands on <html> before React mounts. Avoids a flash-of-wrong-theme
 * on hard refresh. Mirrors the portfolio's ThemeContext pattern but adapted
 * for Next.js App Router (no client-side flash possible without this).
 */
export const themeBootstrapScript = `(function(){try{
var k='${STORAGE_KEY}';var s=localStorage.getItem(k);
var p=(s==='light'||s==='dark'||s==='system')?s:'system';
var r=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;
document.documentElement.classList.add(r);
}catch(e){document.documentElement.classList.add('dark');}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(getStoredPref);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolvePref(getStoredPref()));

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (Safari private mode, sandboxed iframes) —
      // keep the in-memory theme; user just loses persistence.
    }
    const nextResolved = resolvePref(next);
    setResolved(nextResolved);
    applyClass(nextResolved);
  }, []);

  // Re-resolve when OS theme changes, but only if user is on 'system'.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const next = mq.matches ? 'light' : 'dark';
      setResolved(next);
      applyClass(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  // Initial mount: ensure class matches state (covers cases where the
  // bootstrap script didn't run, e.g. tests).
  useEffect(() => {
    applyClass(resolved);
  }, [resolved]);

  return createElement(
    ThemeContext.Provider,
    { value: { theme, resolved, setTheme } },
    children,
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
