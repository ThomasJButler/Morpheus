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
      // Store in session storage if not saving permanently
      sessionStorage.setItem('userSettings', JSON.stringify(settings));
      localStorage.removeItem('userSettings');
    }

    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));

    onClose();
  };

  const testConnection = async () => {
    if (!apiKey) {
      setTestResult('error');
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      // Test the API key through BFF to avoid CORS issues
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', apiKey }),
      });

      const data = await response.json();
      if (data.success) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult('error');
    } finally {
      setTestingConnection(false);
    }
  };

  const testAnthropicConnection = async () => {
    if (!anthropicApiKey) {
      setAnthropicTestResult('error');
      return;
    }

    setTestingAnthropicConnection(true);
    setAnthropicTestResult(null);

    try {
      // Test the Anthropic API key through BFF to avoid CORS issues
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'anthropic', apiKey: anthropicApiKey }),
      });

      const data = await response.json();
      if (data.success) {
        setAnthropicTestResult('success');
      } else {
        setAnthropicTestResult('error');
      }
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      setAnthropicTestResult('error');
    } finally {
      setTestingAnthropicConnection(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <GlassPanel className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" noPadding>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-matrix-green/20">
            <h2 className="text-xl font-mono text-matrix-green matrix-glow">⚙️ Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-matrix-white/60 hover:text-matrix-green hover:bg-matrix-green/10 transition-all duration-200"
              aria-label="Close settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Provider Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-mono text-matrix-green mb-3">
              Active Provider
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setProvider('anthropic')}
                className={clsx(
                  'flex-1 px-4 py-4 rounded-lg font-mono text-sm transition-all duration-300 border-2 relative overflow-hidden',
                  provider === 'anthropic'
                    ? 'bg-matrix-green/15 border-matrix-green text-matrix-green shadow-[0_0_15px_rgba(0,255,0,0.3)]'
                    : 'bg-black/30 border-glass-border text-matrix-white/60 hover:border-matrix-green/50 hover:bg-black/40'
                )}
              >
                {provider === 'anthropic' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-matrix-green rounded-full animate-pulse" />
                )}
                <div className="font-semibold text-base">🤖 Claude</div>
                <div className="text-xs mt-1 opacity-70">Anthropic • Recommended</div>
              </button>
              <button
                onClick={() => setProvider('openai')}
                className={clsx(
                  'flex-1 px-4 py-4 rounded-lg font-mono text-sm transition-all duration-300 border-2 relative overflow-hidden',
                  provider === 'openai'
                    ? 'bg-matrix-cyan/15 border-matrix-cyan text-matrix-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                    : 'bg-black/30 border-glass-border text-matrix-white/60 hover:border-matrix-cyan/50 hover:bg-black/40'
                )}
              >
                {provider === 'openai' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-matrix-cyan rounded-full animate-pulse" />
                )}
                <div className="font-semibold text-base">🧠 GPT</div>
                <div className="text-xs mt-1 opacity-70">OpenAI • Alternative</div>
              </button>
            </div>
            <p className="mt-3 text-xs text-matrix-white/50 text-center">
              Select which AI provider powers your chat responses
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-glass-border my-6" />

          {/* API Key Section */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-mono text-matrix-green mb-2">
                OpenAI API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className={clsx(
                    'w-full px-3 py-2 bg-black/50 border rounded-md',
                    'text-matrix-white placeholder-matrix-white/30',
                    'focus:outline-none focus:border-matrix-green focus:ring-1 focus:ring-matrix-green',
                    'font-mono text-sm',
                    testResult === 'success' ? 'border-matrix-green' :
                    testResult === 'error' ? 'border-red-500' : 'border-glass-border'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-matrix-white/60 hover:text-matrix-green"
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? (
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
              </div>
              <p className="mt-1 text-xs text-matrix-white/40">
                Your API key is stored {saveKey ? 'locally in your browser' : 'only for this session'}
              </p>
              {testResult === 'success' && (
                <p className="mt-1 text-xs text-matrix-green">✓ API key validated successfully</p>
              )}
              {testResult === 'error' && (
                <p className="mt-1 text-xs text-red-500">✗ Invalid API key or connection error</p>
              )}
            </div>

            {/* Test Connection Button */}
            <button
              onClick={testConnection}
              disabled={!apiKey || testingConnection}
              className={clsx(
                'px-4 py-2 text-sm font-mono rounded-md transition-all duration-200 flex items-center space-x-2',
                'border border-glass-border',
                apiKey && !testingConnection
                  ? 'text-matrix-green hover:bg-matrix-green/10 hover:border-matrix-green hover:scale-[1.02]'
                  : 'text-matrix-white/30 cursor-not-allowed'
              )}
            >
              {testingConnection ? (
                <>
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>Testing...</span>
                </>
              ) : (
                <span>Test Connection</span>
              )}
            </button>
          </div>

          {/* OpenAI Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-mono text-matrix-green mb-2">
              OpenAI Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={clsx(
                'w-full px-3 py-2 bg-black/50 border border-glass-border rounded-md',
                'text-matrix-white',
                'focus:outline-none focus:border-matrix-green focus:ring-1 focus:ring-matrix-green',
                'font-mono text-sm'
              )}
            >
              {OPENAI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} - {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="border-t border-glass-border my-6" />

          {/* Anthropic API Key Section */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-mono text-matrix-green mb-2">
                Anthropic API Key
              </label>
              <div className="relative">
                <input
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className={clsx(
                    'w-full px-3 py-2 bg-black/50 border rounded-md',
                    'text-matrix-white placeholder-matrix-white/30',
                    'focus:outline-none focus:border-matrix-green focus:ring-1 focus:ring-matrix-green',
                    'font-mono text-sm',
                    anthropicTestResult === 'success' ? 'border-matrix-green' :
                    anthropicTestResult === 'error' ? 'border-red-500' : 'border-glass-border'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-matrix-white/60 hover:text-matrix-green"
                  aria-label={showAnthropicKey ? 'Hide API key' : 'Show API key'}
                >
                  {showAnthropicKey ? (
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
              </div>
              <p className="mt-1 text-xs text-matrix-white/40">
                Your API key is stored {saveKey ? 'locally in your browser' : 'only for this session'}
              </p>
              {anthropicTestResult === 'success' && (
                <p className="mt-1 text-xs text-matrix-green">✓ API key validated successfully</p>
              )}
              {anthropicTestResult === 'error' && (
                <p className="mt-1 text-xs text-red-500">✗ Invalid API key or connection error</p>
              )}
            </div>

            {/* Test Anthropic Connection Button */}
            <button
              onClick={testAnthropicConnection}
              disabled={!anthropicApiKey || testingAnthropicConnection}
              className={clsx(
                'px-4 py-2 text-sm font-mono rounded-md transition-all duration-200 flex items-center space-x-2',
                'border border-glass-border',
                anthropicApiKey && !testingAnthropicConnection
                  ? 'text-matrix-green hover:bg-matrix-green/10 hover:border-matrix-green hover:scale-[1.02]'
                  : 'text-matrix-white/30 cursor-not-allowed'
              )}
            >
              {testingAnthropicConnection ? (
                <>
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>Testing...</span>
                </>
              ) : (
                <span>Test Anthropic Connection</span>
              )}
            </button>
          </div>

          {/* Anthropic Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-mono text-matrix-green mb-2">
              Anthropic Model
            </label>
            <select
              value={anthropicModel}
              onChange={(e) => setAnthropicModel(e.target.value)}
              className={clsx(
                'w-full px-3 py-2 bg-black/50 border border-glass-border rounded-md',
                'text-matrix-white',
                'focus:outline-none focus:border-matrix-green focus:ring-1 focus:ring-matrix-green',
                'font-mono text-sm'
              )}
            >
              {ANTHROPIC_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} - {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Save Preference */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveKey}
                onChange={(e) => setSaveKey(e.target.checked)}
                className="w-4 h-4 bg-black/50 border-glass-border rounded text-matrix-green focus:ring-matrix-green"
              />
              <span className="text-sm font-mono text-matrix-white/80">
                Remember settings for next time
              </span>
            </label>
          </div>

          {/* Security Warning */}
          <div className="mb-6 p-3 bg-matrix-green/10 border border-matrix-green/30 rounded-md">
            <p className="text-xs text-matrix-green/80">
              <strong>Security Note:</strong> Your API keys are stored locally in your browser and are never sent to our servers.
              They&apos;re only used to communicate directly with OpenAI and Anthropic APIs.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleClearSettings}
              className={clsx(
                'px-4 py-2 text-sm font-mono rounded-md transition-all duration-200',
                'text-red-500 hover:bg-red-500/10 border border-red-500/30'
              )}
            >
              Clear Settings
            </button>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!apiKey && !anthropicApiKey}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}