'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RAGMode } from '@/lib/types';

export type Provider = 'openai' | 'anthropic';

export interface UserSettings {
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  provider: Provider;
  saveApiKey: boolean;
  // RAG Mode settings
  ragMode: RAGMode;
  deepMode: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  openaiApiKey: '',
  openaiModel: 'gpt-5.4-mini',
  anthropicApiKey: '',
  anthropicModel: 'claude-sonnet-4-6',
  provider: 'anthropic',
  saveApiKey: true,
  // Default to auto mode for intelligent routing
  ragMode: 'auto',
  deepMode: false,
};

// Model IDs that have been retired upstream OR dropped from the current
// Settings dropdown. Loading these from localStorage would either 404 the
// API call (retired models) or leave the dropdown in a confused no-selection
// state (dropped options). Migrate them on load to the current default.
const RETIRED_ANTHROPIC_MODELS = new Set([
  'claude-opus-4-7',              // Dropped 2026-05-14 (tier-gating issues)
  'claude-3-5-sonnet-20241022',   // Anthropic retired 2025-10-28
  'claude-3-opus-20240229',       // Anthropic retired (same wave)
  'claude-3-haiku-20240307',      // Anthropic retired (same wave)
]);

// OpenAI's `gpt-5.5` snapshot only resolves under its dated form. We were
// shipping the un-dated string briefly; migrate so beta testers don't have
// to re-Save Settings to fix the 4xx.
const OPENAI_ID_FIXUPS: Record<string, string> = {
  'gpt-5.5': 'gpt-5.5-2026-04-23',
};

function migrateModelIds(parsed: Partial<UserSettings>): boolean {
  let migrated = false;
  if (parsed.openaiModel && OPENAI_ID_FIXUPS[parsed.openaiModel]) {
    parsed.openaiModel = OPENAI_ID_FIXUPS[parsed.openaiModel];
    migrated = true;
  }
  if (parsed.anthropicModel && RETIRED_ANTHROPIC_MODELS.has(parsed.anthropicModel)) {
    parsed.anthropicModel = DEFAULT_SETTINGS.anthropicModel;
    migrated = true;
  }
  if (migrated) {
    console.info('[useSettings] Migrated stale model IDs to current defaults');
  }
  return migrated;
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      // Try localStorage first
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          const migrated = migrateModelIds(parsed);
          // Merge with defaults to handle new fields added over time
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(merged);
          // Persist the migration so we only do this work once
          if (migrated) {
            localStorage.setItem('userSettings', JSON.stringify(merged));
          }
          setIsLoaded(true);
          return;
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }

      // Try sessionStorage as fallback
      const sessionSettings = sessionStorage.getItem('userSettings');
      if (sessionSettings) {
        try {
          const parsed = JSON.parse(sessionSettings);
          const migrated = migrateModelIds(parsed);
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(merged);
          if (migrated) {
            sessionStorage.setItem('userSettings', JSON.stringify(merged));
          }
          setIsLoaded(true);
          return;
        } catch (e) {
          console.error('Failed to parse session settings:', e);
        }
      }

      setIsLoaded(true);
    };

    loadSettings();

    // Listen for settings updates from other components
    const handleSettingsUpdate = (event: CustomEvent<UserSettings>) => {
      setSettings(event.detail);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Save based on preference
    if (updated.saveApiKey) {
      localStorage.setItem('userSettings', JSON.stringify(updated));
      sessionStorage.removeItem('userSettings');
    } else {
      sessionStorage.setItem('userSettings', JSON.stringify(updated));
      localStorage.removeItem('userSettings');
    }

    // Notify other components
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updated }));
  }, [settings]);

  const clearSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('userSettings');
    sessionStorage.removeItem('userSettings');
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: DEFAULT_SETTINGS }));
  }, []);

  const hasApiKey = useCallback(() => {
    return !!settings.openaiApiKey && settings.openaiApiKey.trim().length > 0;
  }, [settings.openaiApiKey]);

  const hasAnthropicApiKey = useCallback(() => {
    return !!settings.anthropicApiKey && settings.anthropicApiKey.trim().length > 0;
  }, [settings.anthropicApiKey]);

  return {
    settings,
    updateSettings,
    clearSettings,
    hasApiKey,
    hasAnthropicApiKey,
    isLoaded,
  };
}