'use client';

import { useEffect, useState } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { clsx } from 'clsx';
import type { ModelEntry, RetrievalMode } from '@/lib/types';
import { useSettings } from '@/lib/hooks/useSettings';
import { useTheme, type ThemePref } from '@/lib/theme';
import { apiClient } from '@/lib/api-client';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const RETRIEVAL_MODES: { value: RetrievalMode; label: string; description: string }[] = [
  { value: 'hybrid', label: 'Hybrid', description: 'Vector + keyword (BM25), fused. The default.' },
  { value: 'vector', label: 'Vector', description: 'Semantic search only.' },
];

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, clearSettings } = useSettings();

  const [mode, setMode] = useState<RetrievalMode>('hybrid');
  const [deep, setDeep] = useState(false);
  const [model, setModel] = useState<string>('');
  const [chatModels, setChatModels] = useState<ModelEntry[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState<string>('the configured default');

  // Seed local state from saved settings each time the modal opens, and
  // fetch what Ollama actually has installed for the dropdown.
  useEffect(() => {
    if (!isOpen) return;
    setMode(settings.mode);
    setDeep(settings.deep);
    setModel(settings.model ?? '');
    setModelsError(null);
    apiClient
      .listModels()
      .then((response) => {
        setChatModels(response.chat);
        const configured = response.chat.find((m) => m.configured);
        if (configured) setDefaultModel(configured.name);
      })
      .catch((error: Error) => {
        setChatModels([]);
        setModelsError(error.message);
      });
  }, [isOpen, settings.mode, settings.deep, settings.model]);

  const handleSave = () => {
    updateSettings({ mode, deep, model: model || null });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="lg"
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
            onClick={clearSettings}
            className="mr-auto px-3 py-1.5 text-[11px] font-mono text-mode-red hover:bg-mode-red/10 rounded-v2-sm transition-colors"
          >
            Reset to defaults
          </button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Theme */}
        <div>
          <label className="block text-xs font-mono text-matrix-white/50 uppercase tracking-wider mb-3">
            Theme
          </label>
          <div className="flex gap-2" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as ThemePref[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTheme(opt)}
                aria-pressed={theme === opt}
                className={clsx('matrix-tab text-center capitalize', theme === opt && 'border-matrix-green')}
                data-state={theme === opt ? 'active' : 'inactive'}
              >
                <div className="flex items-center justify-center gap-2">
                  {theme === opt && <span className="w-2 h-2 bg-matrix-green rounded-full animate-pulse" />}
                  <span>{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="matrix-divider" />

        {/* Model */}
        <div className="space-y-3">
          <h3 className="section-header">Model</h3>
          <p className="text-xs text-matrix-white/40">
            Answers come from a model running in Ollama on this machine. The
            list shows what is installed; add more with{' '}
            <code className="text-matrix-green/80">ollama pull &lt;name&gt;</code>.
          </p>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="matrix-select"
            aria-label="Chat model"
          >
            <option value="">Default ({defaultModel})</option>
            {chatModels
              .filter((m) => !m.configured)
              .map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}{m.parameter_size ? ` · ${m.parameter_size}` : ''}
                </option>
              ))}
          </select>
          {modelsError && (
            <p className="text-xs text-mode-red font-mono">
              Could not list models: {modelsError}
            </p>
          )}
        </div>

        <div className="matrix-divider" />

        {/* Retrieval */}
        <div className="space-y-4">
          <h3 className="section-header">Retrieval</h3>
          <div className="flex gap-2" role="group" aria-label="Retrieval mode">
            {RETRIEVAL_MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={mode === option.value}
                className={clsx('matrix-tab text-center', mode === option.value && 'border-matrix-green')}
                data-state={mode === option.value ? 'active' : 'inactive'}
              >
                <div className="flex items-center justify-center gap-2">
                  {mode === option.value && <span className="w-2 h-2 bg-matrix-green rounded-full animate-pulse" />}
                  <span>{option.label}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-matrix-white/40">
            {RETRIEVAL_MODES.find((o) => o.value === mode)?.description}
          </p>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={deep}
              onChange={(e) => setDeep(e.target.checked)}
              className="w-4 h-4 bg-matrix-black/60 border-glass-border rounded text-matrix-green focus:ring-matrix-green/50 focus:ring-offset-0"
            />
            <div>
              <span className="text-sm font-mono text-matrix-white/70 group-hover:text-matrix-white transition-colors">
                Deep retrieval
              </span>
              <p className="text-xs text-matrix-white/40 mt-0.5">
                The model drafts up to three sub-questions, each is searched
                separately and the results are fused. Slower, wider net.
              </p>
            </div>
          </label>
        </div>

        <div className="matrix-divider" />

        {/* What happens to your data */}
        <div className="p-3 bg-matrix-green/5 border border-matrix-green/20 rounded-lg space-y-1.5">
          <p className="text-xs text-matrix-white/60 leading-relaxed">
            <span className="text-matrix-green font-medium">Local by design:</span>{' '}
            documents, embeddings and the search index live in{' '}
            <code className="text-matrix-green/80">backend/data/</code> on this
            machine and stay there until you delete them. Questions and answers
            go to Ollama on 127.0.0.1 and nowhere else.
          </p>
          <p className="text-xs text-matrix-white/50 leading-relaxed">
            No accounts, no API keys, no telemetry. The test that enforces
            this lives at <code className="text-matrix-green/80">backend/tests/test_no_egress.py</code>.
          </p>
        </div>
      </div>
    </Modal>
  );
}
