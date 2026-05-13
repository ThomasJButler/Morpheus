'use client';

import { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { clsx } from 'clsx';
import type { RAGMode } from '@/lib/types';
import type { UserSettings, Provider } from '@/lib/hooks/useSettings';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
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

// RAG modes for intelligent document retrieval
const RAG_MODES: { value: RAGMode; label: string; description: string; latency: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Intelligent routing based on query', latency: 'varies' },
  { value: 'simple', label: 'Simple', description: 'Fast semantic search', latency: '~800ms' },
  { value: 'hybrid', label: 'Hybrid', description: 'Semantic + keyword search', latency: '~1200ms' },
  { value: 'agentic', label: 'Agentic', description: 'AI agent with tool use', latency: '~2600ms' },
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

  // RAG mode settings
  const [ragMode, setRagMode] = useState<RAGMode>('auto');
  const [deepMode, setDeepMode] = useState(false);

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
        // Load RAG mode settings with defaults for backwards compatibility
        setRagMode(settings.ragMode || 'auto');
        setDeepMode(settings.deepMode ?? false);
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
      ragMode: ragMode,
      deepMode: deepMode,
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
    setRagMode('auto');
    setDeepMode(false);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="md"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      }
      footer={
        <>
          <button
            type="button"
            onClick={handleClearSettings}
            className="mr-auto px-3 py-1.5 text-[11px] font-mono text-mode-red hover:bg-mode-red/10 rounded-v2-sm transition-colors"
          >
            Clear all
          </button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!apiKey && !anthropicApiKey}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
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

          {/* RAG Mode Settings */}
          <div className="space-y-5">
            <h3 className="section-header">
              Retrieval Mode
            </h3>

            {/* RAG Mode Selector */}
            <div>
              <label className="block text-xs font-mono text-matrix-white/50 uppercase tracking-wider mb-2">
                Search Strategy
              </label>
              <select
                value={ragMode}
                onChange={(e) => setRagMode(e.target.value as RAGMode)}
                className="matrix-select"
              >
                {RAG_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label} - {mode.description} ({mode.latency})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-matrix-white/40">
                {ragMode === 'auto' && 'System analyses query complexity and routes to optimal mode.'}
                {ragMode === 'simple' && 'Fastest option using semantic embeddings only.'}
                {ragMode === 'hybrid' && 'Combines semantic + keyword search for better recall.'}
                {ragMode === 'agentic' && 'AI agent that can search multiple times and refine results.'}
              </p>
            </div>

            {/* Deep Mode Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={deepMode}
                onChange={(e) => setDeepMode(e.target.checked)}
                className="w-4 h-4 bg-matrix-black/60 border-glass-border rounded text-matrix-green focus:ring-matrix-green/50 focus:ring-offset-0"
              />
              <div>
                <span className="text-sm font-mono text-matrix-white/70 group-hover:text-matrix-white transition-colors">
                  Deep Dive Mode
                </span>
                <p className="text-xs text-matrix-white/40 mt-0.5">
                  Force agentic mode for thorough multi-pass search
                </p>
              </div>
            </label>
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

      </div>
    </Modal>
  );
}
