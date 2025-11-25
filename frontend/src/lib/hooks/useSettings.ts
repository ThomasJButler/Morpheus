'use client';

import { useState, useEffect, useCallback } from 'react';

export type Provider = 'openai' | 'anthropic';

export interface UserSettings {
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  provider: Provider;
  saveApiKey: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  openaiApiKey: '',
  openaiModel: 'gpt-3.5-turbo',
  anthropicApiKey: '',
  anthropicModel: 'claude-sonnet-4-20250514',
  provider: 'anthropic',
  saveApiKey: true,
};

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
          setSettings(parsed);
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
          setSettings(parsed);
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