'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RetrievalMode } from '@/lib/types';

export interface UserSettings {
  mode: RetrievalMode;
  deep: boolean;
  /** null = use the backend's configured default model. */
  model: string | null;
}

const DEFAULT_SETTINGS: UserSettings = {
  mode: 'hybrid',
  deep: false,
  model: null,
};

const STORAGE_KEY = 'morpheus.settings';
const UPDATE_EVENT = 'morpheus:settings-updated';

// The pre-2.0 settings blob lived under this key and contained API keys.
// There are no keys any more; purge the old blob wherever we find it so
// stale credentials don't linger in localStorage.
const LEGACY_KEY = 'userSettings';

function loadStored(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    window.sessionStorage.removeItem(LEGACY_KEY);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      mode: parsed.mode === 'vector' ? 'vector' : 'hybrid',
      deep: parsed.deep === true,
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(loadStored());
    setIsLoaded(true);
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UserSettings>).detail;
      if (detail) setSettings(detail);
    };
    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate);
  }, []);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...partial };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable; settings live for this tab only.
      }
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: next }));
      return next;
    });
  }, []);

  const clearSettings = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing to do
    }
    setSettings(DEFAULT_SETTINGS);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: DEFAULT_SETTINGS }));
  }, []);

  return { settings, updateSettings, clearSettings, isLoaded };
}
