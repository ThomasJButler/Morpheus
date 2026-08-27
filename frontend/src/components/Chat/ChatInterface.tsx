'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import Composer from './Composer';
import EmptyState from './EmptyState';
import UploadButton from '../Documents/UploadButton';
import Settings from '../Settings/Settings';
import QuickStartGuide from '../Onboarding/QuickStartGuide';
import BackToTopButton from '../UI/BackToTopButton';
import ConfirmDialog from '../UI/ConfirmDialog';
import RAGModeIndicator from './RAGModeIndicator';
import ThinkingInputState from './ThinkingInputState';
import { useSettings } from '@/lib/hooks/useSettings';
import { useLocalChat } from '@/lib/hooks/useLocalChat';
import { useBackendHealth } from '@/lib/hooks/useBackendHealth';
import { useAutoHideScrollbar } from '@/lib/hooks/useAutoHideScrollbar';
import { apiClient } from '@/lib/api-client';
import type { DocumentInfo, DocumentUploadResponse } from '@/lib/types';

interface ChatInterfaceProps {
  /** True when embedded in the v2 AppShell, whose chat-col constrains height. */
  fillParent?: boolean;
}

export default function ChatInterface({ fillParent = false }: ChatInterfaceProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [input, setInput] = useState('');

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useAutoHideScrollbar(messageContainerRef);

  const { settings } = useSettings();
  const { messages, setMessages, isLoading, error, send } = useLocalChat();

  // Header's icon cluster dispatches CustomEvents (no prop drilling).
  useEffect(() => {
    const openGuide = () => setShowGuide(true);
    const openSettings = () => setShowSettings(true);
    window.addEventListener('morpheus:open-guide', openGuide);
    window.addEventListener('morpheus:open-settings', openSettings);
    return () => {
      window.removeEventListener('morpheus:open-guide', openGuide);
      window.removeEventListener('morpheus:open-settings', openSettings);
    };
  }, []);

  // Export chat as JSON
  const exportChat = useCallback(() => {
    if (messages.length === 0) return;
    const chatExport = {
      exportedAt: new Date().toISOString(),
      model: settings.model ?? 'default',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        citations: m.citations,
        grounded: m.done?.grounded,
        timestamp: m.timestamp ?? new Date().toISOString(),
      })),
    };
    const blob = new Blob([JSON.stringify(chatExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morpheus-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, settings.model]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (messages.length > 0) exportChat();
      }
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowGuide(false);
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [messages, exportChat]);

  const handleScroll = useCallback(() => {
    if (messageContainerRef.current) {
      setShowBackToTop(messageContainerRef.current.scrollTop > 300);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    messageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearClick = useCallback(() => {
    if (messages.length > 0) setShowClearConfirm(true);
  }, [messages.length]);

  const confirmClear = useCallback(() => {
    setMessages([]);
    setShowClearConfirm(false);
  }, [setMessages]);

  const handlePromptSelect = useCallback((text: string) => {
    setInput(text);
    inputRef.current?.focus();
  }, []);

  // Broadcast the latest answer's citations + done stats to the System
  // panel. Depending on the last assistant id + done keeps this at
  // ~once-per-response instead of once-per-token.
  const lastAssistant = messages.findLast?.((m) => m.role === 'assistant');
  const lastAssistantId = lastAssistant?.id ?? null;
  const lastDone = lastAssistant?.done;
  useEffect(() => {
    if (typeof window === 'undefined' || !lastAssistantId) return;
    window.dispatchEvent(
      new CustomEvent('morpheus:metrics-updated', {
        detail: {
          citations: lastAssistant?.citations ?? [],
          done: lastDone,
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracked via the stable id + done
  }, [lastAssistantId, lastDone]);

  // Message queue while the backend is still coming up.
  const health = useBackendHealth();
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  const dispatchSend = useCallback(
    (text: string) => {
      send(text, { mode: settings.mode, deep: settings.deep, model: settings.model });
    },
    [send, settings.mode, settings.deep, settings.model],
  );

  const handleSubmitWithQueue = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault?.();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput('');
      if (health.status !== 'ready') {
        setQueuedMessage(text);
        return;
      }
      dispatchSend(text);
    },
    [input, isLoading, health.status, dispatchSend],
  );

  useEffect(() => {
    if (health.status !== 'ready' || !queuedMessage) return;
    dispatchSend(queuedMessage);
    setQueuedMessage(null);
  }, [health.status, queuedMessage, dispatchSend]);

  const refreshDocumentList = useCallback(async () => {
    try {
      const listResponse = await apiClient.listDocuments();
      setDocuments(listResponse.documents ?? []);
    } catch {
      // The docs sidebar surfaces list errors; the toolbar chip just empties.
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    refreshDocumentList();
    window.addEventListener('morpheus:documents-changed', refreshDocumentList);
    return () =>
      window.removeEventListener('morpheus:documents-changed', refreshDocumentList);
  }, [refreshDocumentList]);

  const handleUploadComplete = useCallback(async (response: DocumentUploadResponse) => {
    setUploadSuccess(
      `${response.replaced ? 'Replaced' : 'Indexed'} "${response.source}": ${response.chunks} chunks`,
    );
    await refreshDocumentList();
    setTimeout(() => setUploadSuccess(null), 5000);
  }, [refreshDocumentList]);

  return (
    <div className={`flex flex-col ${fillParent ? 'h-full' : 'h-[calc(100dvh-60px)] sm:h-[calc(100vh-120px)]'} overflow-hidden`}>
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-1 py-1.5 gap-2">
        {/* Left: model chip + doc count + mode + message count */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="
              inline-flex items-center px-3 py-1.5 rounded-full text-xs font-mono
              border transition-all duration-300
              border-matrix-green/50 text-matrix-green bg-matrix-green/10
              hover:bg-matrix-green/20 hover:border-matrix-green
            "
            title="Local model via Ollama. Click to change."
          >
            <span className="w-1.5 h-1.5 rounded-full mr-2 bg-matrix-green animate-pulse" />
            {settings.model ?? 'local model'}
          </button>

          {documents.length > 0 && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono
                         border border-matrix-white/15 bg-matrix-white/5 text-matrix-white/70"
              title={`${documents.length} document${documents.length === 1 ? '' : 's'} in the library`}
            >
              {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
            </span>
          )}

          <RAGModeIndicator
            mode={settings.mode}
            deep={settings.deep}
            done={lastDone}
            isProcessing={isLoading}
          />

          {messages.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono
                           bg-matrix-white/5 border border-matrix-white/10 text-matrix-white/60 animate-fade-in">
              {messages.length}
            </span>
          )}
        </div>

        {/* Right: upload | save/clear | guide/settings */}
        <div className="flex items-center">
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            <UploadButton onUploadComplete={handleUploadComplete} />
          </div>

          <div className="hidden sm:block w-px h-6 bg-matrix-green/20 mx-2" />

          {/* Mobile overflow menu */}
          <div className="relative sm:hidden ml-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="More actions"
              aria-expanded={mobileMenuOpen}
              aria-haspopup="menu"
              className="toolbar-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </button>
            {mobileMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobileMenuOpen(false)} aria-hidden />
                <div role="menu" className="absolute right-0 top-full mt-1 z-40 min-w-[160px] rounded-md border border-edge-default bg-surface-elev shadow-lg overflow-hidden">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); exportChat(); }}
                    disabled={messages.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-mono text-fg-primary hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    Export chat
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); handleClearClick(); }}
                    disabled={messages.length === 0 || isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-mono text-mode-red hover:bg-mode-red/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent border-t border-edge-subtle"
                  >
                    Clear conversation
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Desktop chat actions */}
          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            <button
              onClick={exportChat}
              disabled={messages.length === 0}
              className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Save chat"
              title="Export chat (⌘S)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={handleClearClick}
              disabled={messages.length === 0 || isLoading}
              className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed hover:text-red-400 hover:border-red-400/30"
              aria-label="Clear messages"
              title="Clear conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>

          <div className="hidden sm:block w-px h-6 bg-matrix-green/20 mx-2" />

          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            <button onClick={() => setShowGuide(true)} className="toolbar-button" aria-label="Show quick start guide" title="Quick start guide">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden lg:inline">Guide</span>
            </button>
            <button onClick={() => setShowSettings(true)} className="toolbar-button" aria-label="Open settings" title="Model, retrieval mode and theme">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden lg:inline">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {uploadSuccess && (
        <div className="flex-shrink-0 mx-1 p-3 bg-matrix-green/10 border border-matrix-green/50 rounded-md text-matrix-green text-sm animate-fade-in matrix-font">
          {uploadSuccess}
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-col md:flex-row flex-1 gap-2 sm:gap-4 min-h-0 overflow-hidden px-1">
        <div className="flex flex-col flex-1 w-full min-h-0">
          <div className="glass-panel relative flex-1 flex flex-col p-2 sm:p-4 overflow-hidden min-h-0">
            {error && (
              <div className="flex-shrink-0 mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm matrix-font">
                {error}
              </div>
            )}

            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div
                ref={messageContainerRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-matrix touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
              >
                {messages.length === 0 ? (
                  <EmptyState onSelectPrompt={handlePromptSelect} />
                ) : (
                  <MessageList messages={messages} />
                )}
              </div>

              <BackToTopButton show={showBackToTop} onClick={scrollToTop} />
            </div>

            {queuedMessage && (
              <div
                role="status"
                aria-live="polite"
                className="flex-shrink-0 mt-2 flex items-start gap-2 rounded-v2-sm border border-edge-subtle bg-surface-card px-3 py-2 font-mono text-[11.5px] text-fg-secondary"
              >
                <span aria-hidden className="mt-1 w-1.5 h-1.5 rounded-full bg-mode-amber animate-pulse" style={{ boxShadow: '0 0 6px var(--v2-amber)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-fg-primary">Message queued · sending when the backend is ready</div>
                  <div className="mt-0.5 truncate text-fg-muted">{queuedMessage}</div>
                </div>
              </div>
            )}

            <div className="flex-shrink-0 pt-3 sm:pt-4 border-t border-edge-subtle">
              {isLoading ? (
                <ThinkingInputState />
              ) : (
                <Composer
                  ref={inputRef}
                  input={input}
                  handleInputChange={(e) => setInput(e.target.value)}
                  handleSubmit={handleSubmitWithQueue}
                  isLoading={isLoading}
                  mode={settings.mode}
                  deep={settings.deep}
                  onOpenSettings={() => setShowSettings(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <QuickStartGuide
        isOpen={showGuide}
        onDismiss={() => setShowGuide(false)}
        onOpenSettings={() => {
          setShowGuide(false);
          setShowSettings(true);
        }}
      />

      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Chat History?"
        message="This will remove all messages from this conversation."
        confirmText="Clear Messages"
        cancelText="Cancel"
        confirmVariant="danger"
        messageCount={messages.length}
        onConfirm={confirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
