'use client';

import { useState, useEffect } from 'react';
import GlassPanel from '../UI/GlassPanel';
import Button from '../UI/Button';
import { clsx } from 'clsx';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export type Provider = 'openai' | 'anthropic';

export interface UserSettings {
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  provider: Provider;
  saveApiKey: boolean;
}

const OPENAI_MODELS = [
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo', description: 'Most capable, higher cost' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Most capable, standard' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', description: 'Larger context window' },
];

const ANTHROPIC_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Latest, balanced' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Fast and capable' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'Most capable' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Fastest, cost-effective' },
];

export default function Settings({ isOpen, onClose }: SettingsProps) {
  // OpenAI settings
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [showKey, setShowKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Anthropic settings
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-20250514');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [testingAnthropicConnection, setTestingAnthropicConnection] = useState(false);
  const [anthropicTestResult, setAnthropicTestResult] = useState<'success' | 'error' | null>(null);

  // Provider selection
  const [provider, setProvider] = useState<Provider>('anthropic');

  // General settings
  const [saveKey, setSaveKey] = useState(true);

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const settings: UserSettings = JSON.parse(savedSettings);
        setApiKey(settings.openaiApiKey || '');
        setModel(settings.openaiModel || 'gpt-3.5-turbo');
        setAnthropicApiKey(settings.anthropicApiKey || '');
        setAnthropicModel(settings.anthropicModel || 'claude-sonnet-4-20250514');
        setProvider(settings.provider || 'anthropic');
        setSaveKey(settings.saveApiKey ?? true);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  const handleSave = () => {
    const settings: UserSettings = {
      openaiApiKey: saveKey ? apiKey : '',
      openaiModel: model,
      anthropicApiKey: saveKey ? anthropicApiKey : '',
      anthropicModel: anthropicModel,
      provider: provider,
      saveApiKey: saveKey,
    };

    if (saveKey) {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    } else {
      sessionStorage.setItem('userSettings', JSON.stringify(settings));
      localStorage.removeItem('userSettings');
    }

    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
    onClose();
  };

  const testConnection = async (providerType: Provider) => {
    const key = providerType === 'openai' ? apiKey : anthropicApiKey;
    const setTesting = providerType === 'openai' ? setTestingConnection : setTestingAnthropicConnection;
    const setResult = providerType === 'openai' ? setTestResult : setAnthropicTestResult;

    if (!key) {
      setResult('error');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerType, apiKey: key }),
      });

      const data = await response.json();
      setResult(data.success ? 'success' : 'error');
    } catch (error) {
      console.error('Connection test failed:', error);
      setResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleClearSettings = () => {
    setApiKey('');
    setModel('gpt-3.5-turbo');
    setAnthropicApiKey('');
    setAnthropicModel('claude-sonnet-4-20250514');
    setProvider('anthropic');
    setSaveKey(true);
    localStorage.removeItem('userSettings');
    sessionStorage.removeItem('userSettings');
    setTestResult(null);
    setAnthropicTestResult(null);
  };

  // Get current provider's settings
  const currentApiKey = provider === 'anthropic' ? anthropicApiKey : apiKey;
  const setCurrentApiKey = provider === 'anthropic' ? setAnthropicApiKey : setApiKey;
  const currentModel = provider === 'anthropic' ? anthropicModel : model;
  const setCurrentModel = provider === 'anthropic' ? setAnthropicModel : setModel;
  const currentShowKey = provider === 'anthropic' ? showAnthropicKey : showKey;
  const setCurrentShowKey = provider === 'anthropic' ? setShowAnthropicKey : setShowKey;
  const currentTesting = provider === 'anthropic' ? testingAnthropicConnection : testingConnection;
  const currentTestResult = provider === 'anthropic' ? anthropicTestResult : testResult;
  const currentModels = provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS;
  const keyPlaceholder = provider === 'anthropic' ? 'sk-ant-...' : 'sk-...';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <GlassPanel className="w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" noPadding>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-mono text-matrix-green matrix-glow flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-matrix-white/60 hover:text-matrix-green hover:bg-matrix-green/10 transition-all duration-200"
              aria-label="Close settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Provider Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-mono text-matrix-white/50 uppercase tracking-wider mb-3">
              AI Provider
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setProvider('anthropic')}
                className={clsx('matrix-tab text-center', provider === 'anthropic' && 'border-matrix-green')}
                data-state={provider === 'anthropic' ? 'active' : 'inactive'}
              >
                <div className="flex items-center justify-center gap-2">
                  {provider === 'anthropic' && (
                    <span className="w-2 h-2 bg-matrix-green rounded-full animate-pulse" />
                  )}
                  <span>Claude</span>
                </div>
                <div className="text-xs opacity-60 mt-0.5">Anthropic</div>
              </button>
              <button
                onClick={() => setProvider('openai')}
                className={clsx('matrix-tab text-center', provider === 'openai' && 'border-matrix-cyan')}
                data-state={provider === 'openai' ? 'active' : 'inactive'}
                style={provider === 'openai' ? { borderColor: 'var(--matrix-cyan)', color: 'var(--matrix-cyan)' } : {}}
              >
                <div className="flex items-center justify-center gap-2">
                  {provider === 'openai' && (
                    <span className="w-2 h-2 bg-matrix-cyan rounded-full animate-pulse" />
                  )}
                  <span>GPT</span>
                </div>
                <div className="text-xs opacity-60 mt-0.5">OpenAI</div>
              </button>
            </div>
          </div>

          <div className="matrix-divider" />

          {/* Active Provider Settings */}
          <div className="space-y-5">
            <h3 className="section-header">
              {provider === 'anthropic' ? 'Claude' : 'GPT'} Configuration
            </h3>

            {/* API Key */}
            <div>
              <label className="block text-xs font-mono text-matrix-white/50 uppercase tracking-wider mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={currentShowKey ? 'text' : 'password'}
                  value={currentApiKey}
                  onChange={(e) => setCurrentApiKey(e.target.value)}
                  placeholder={keyPlaceholder}
                  className={clsx(
                    'w-full px-4 py-3 bg-matrix-black/60 border rounded-lg',
                    'text-matrix-white placeholder-matrix-white/30',
                    'focus:outline-none focus:border-matrix-green focus:ring-1 focus:ring-matrix-green/50',
                    'font-mono text-sm transition-all duration-200',
                    currentTestResult === 'success' ? 'border-matrix-green' :
                    currentTestResult === 'error' ? 'border-red-500' : 'border-glass-border'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setCurrentShowKey(!currentShowKey)}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-matrix-white/40 hover:text-matrix-green transition-colors"
                  aria-label={currentShowKey ? 'Hide API key' : 'Show API key'}
                >
                  {currentShowKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => testConnection(provider)}
                  disabled={!currentApiKey || currentTesting}
                  className={clsx(
                    'absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-mono',
                    'transition-all duration-200',
                    currentApiKey && !currentTesting
                      ? 'text-matrix-green hover:bg-matrix-green/20'
                      : 'text-matrix-white/30 cursor-not-allowed'
                  )}
                >
                  {currentTesting ? '...' : '⚡'}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-matrix-white/40">
                  Stored {saveKey ? 'locally in browser' : 'for this session only'}
                </span>
                {currentTestResult === 'success' && (
                  <span className="text-xs text-matrix-green">✓ Valid</span>
                )}
                {currentTestResult === 'error' && (
                  <span className="text-xs text-red-400">✗ Invalid</span>
                )}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-mono text-matrix-white/50 uppercase tracking-wider mb-2">
                Model
              </label>
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="matrix-select"
              >
                {currentModels.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} - {m.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="matrix-divider" />

          {/* General Settings */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={saveKey}
                onChange={(e) => setSaveKey(e.target.checked)}
                className="w-4 h-4 bg-matrix-black/60 border-glass-border rounded text-matrix-green focus:ring-matrix-green/50 focus:ring-offset-0"
              />
              <span className="text-sm font-mono text-matrix-white/70 group-hover:text-matrix-white transition-colors">
                Remember settings
              </span>
            </label>

            {/* Security Note */}
            <div className="p-3 bg-matrix-green/5 border border-matrix-green/20 rounded-lg">
              <p className="text-xs text-matrix-white/50 leading-relaxed">
                <span className="text-matrix-green font-medium">Security:</span> API keys are stored locally and only sent directly to {provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}.
              </p>
            </div>
          </div>

          <div className="matrix-divider" />

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleClearSettings}
              className="px-3 py-2 text-xs font-mono text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            >
              Clear All
            </button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!apiKey && !anthropicApiKey}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
