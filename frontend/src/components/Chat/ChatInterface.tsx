'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
import Composer from './Composer';
import EmptyState from './EmptyState';
import DocumentStats from '../Documents/DocumentStats';
import SystemStatus from '../Documents/SystemStatus';
import UploadButton from '../Documents/UploadButton';
import GlassPanel from '../UI/GlassPanel';
import Settings from '../Settings/Settings';
import QuickStartGuide from '../Onboarding/QuickStartGuide';
import BackToTopButton from '../UI/BackToTopButton';
import ConfirmDialog from '../UI/ConfirmDialog';
import RAGModeIndicator from './RAGModeIndicator';
import FloatingInsightPanel from './FloatingInsightPanel';
import ThinkingInputState from './ThinkingInputState';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSession } from '@/lib/hooks/useSession';
import { useBackendHealth } from '@/lib/hooks/useBackendHealth';
import { apiClient } from '@/lib/api-client';
import { DocumentUploadResponse, RAGMode, QueryAnalysis, EnhancedRetrievalMetrics } from '@/lib/types';

interface ChatInterfaceProps {
  /**
   * When true, the top wrapper uses `h-full` so the component fills its
   * parent's height. Required when embedded inside the v2 AppShell, whose
   * chat-col already constrains height via CSS grid. Defaults to false to
   * preserve the legacy `100dvh - 60px` calc for the non-shell render path.
   */
  fillParent?: boolean;
}

export default function ChatInterface({ fillParent = false }: ChatInterfaceProps = {}) {
  const [showDocStats, setShowDocStats] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [documentList, setDocumentList] = useState<string[]>([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // RAG metadata state for visualization
  const [ragMetadata, setRagMetadata] = useState<{
    modeUsed?: RAGMode;
    analysis?: QueryAnalysis;
    metrics?: EnhancedRetrievalMetrics;
  }>({});

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { settings, hasApiKey, hasAnthropicApiKey } = useSettings();
  const { sessionId, isInitialized, isCleaningUp } = useSession();

  // Set session ID on API client when it changes
  useEffect(() => {
    if (sessionId) {
      apiClient.setSessionId(sessionId);
    }
  }, [sessionId]);

  // Use Vercel AI SDK's useChat hook - now points to Next.js BFF route
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    setInput,
    append,
  } = useChat({
    api: '/api/chat', // Next.js BFF route (fetches context from FastAPI, streams from provider)
    headers: sessionId ? { 'X-Session-ID': sessionId } : {},
    body: {
      // Pass provider selection and API keys from settings
      provider: settings.provider,
      anthropicApiKey: settings.anthropicApiKey,
      anthropicModel: settings.anthropicModel,
      openaiApiKey: settings.openaiApiKey,
      openaiModel: settings.openaiModel,
      // RAG mode settings
      ragMode: settings.ragMode,
      deepMode: settings.deepMode,
    },
    onResponse: async (response) => {
      // Extract RAG metadata from response headers
      const modeUsed = response.headers.get('X-RAG-Mode') as RAGMode | null;
      const analysisHeader = response.headers.get('X-RAG-Analysis');
      const metricsHeader = response.headers.get('X-RAG-Metrics');

      try {
        setRagMetadata({
          modeUsed: modeUsed || undefined,
          analysis: analysisHeader ? JSON.parse(analysisHeader) : undefined,
          metrics: metricsHeader ? JSON.parse(metricsHeader) : undefined,
        });
        console.log('📊 RAG metadata extracted:', { mode: modeUsed, hasAnalysis: !!analysisHeader, hasMetrics: !!metricsHeader });
      } catch (error) {
        console.error('Failed to parse RAG metadata:', error);
      }
    },
    onFinish: async (message) => {
      console.log('✅ Stream finished:', message.content.substring(0, 50));
    },
    onError: (error) => {
      console.error('❌ Stream error:', error);
    },
  });

  // Export chat as JSON
  const exportChat = useCallback(() => {
    if (messages.length === 0) return;

    const chatExport = {
      exportedAt: new Date().toISOString(),
      provider: settings.provider,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt || new Date().toISOString(),
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
  }, [messages, settings.provider]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Focus input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Cmd/Ctrl + S - Export chat
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (messages.length > 0) {
          exportChat();
        }
      }

      // Escape - Close modals
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowGuide(false);
        setShowDocStats(false);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [messages, exportChat]);

  // Handle scroll to show/hide back-to-top button
  const handleScroll = useCallback(() => {
    if (messageContainerRef.current) {
      const { scrollTop } = messageContainerRef.current;
      setShowBackToTop(scrollTop > 300);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    messageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearClick = useCallback(() => {
    if (messages.length > 0) {
      setShowClearConfirm(true);
    }
  }, [messages.length]);

  const confirmClear = useCallback(() => {
    setMessages([]);
    setShowClearConfirm(false);
  }, [setMessages]);

  // Quick-prompt selection from EmptyState — uses useChat's setInput
  // (controlled input) and focuses the composer so the user can edit/send.
  const handlePromptSelect = useCallback((text: string) => {
    setInput(text);
    inputRef.current?.focus();
  }, [setInput]);

  // Cold-start message queue: when the backend isn't ready, intercept the
  // submit, stash the input, and flush via useChat's append() the moment
  // the health probe transitions to ready.
  const health = useBackendHealth();
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  const handleSubmitWithQueue = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault?.();
      const text = input.trim();
      if (!text || isLoading) return;
      if (health.status !== 'ready') {
        setQueuedMessage(text);
        setInput('');
        return;
      }
      handleSubmit(e);
    },
    [input, isLoading, health.status, handleSubmit, setInput],
  );

  useEffect(() => {
    if (health.status !== 'ready' || !queuedMessage) return;
    append({ role: 'user', content: queuedMessage });
    setQueuedMessage(null);
  }, [health.status, queuedMessage, append]);

  const handleUploadComplete = useCallback(async (response: DocumentUploadResponse) => {
    setUploadSuccess(`Uploaded "${response.document_id}" - ${response.chunks_created} chunks created`);
    setShowDocStats(true);

    // Refresh stats
    setTimeout(() => {
      setStatsRefreshKey(prev => prev + 1);
    }, 400);

    // Fetch updated document list
    try {
      const listResponse = await apiClient.listDocuments();
      setDocumentList(listResponse.documents || []);
    } catch (error) {
      console.error('Failed to fetch document list:', error);
    }

    // Clear success message after 5 seconds
    setTimeout(() => {
      setUploadSuccess(null);
    }, 5000);
  }, []);

  return (
    <div className={`flex flex-col ${fillParent ? 'h-full' : 'h-[calc(100dvh-60px)] sm:h-[calc(100vh-120px)]'} overflow-hidden`}>
      {/* Enhanced Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-1 py-1.5 gap-2">
        {/* Left side: Provider Badge + Message count */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Provider Badge with tooltip */}
          <div className="relative group/provider">
            <span className={`
              inline-flex items-center px-3 py-1.5 rounded-full text-xs font-mono
              border transition-all duration-300 cursor-default
              hover:scale-105
              ${settings.provider === 'anthropic'
                ? 'border-matrix-green/50 text-matrix-green bg-matrix-green/10 hover:bg-matrix-green/20 hover:border-matrix-green'
                : 'border-matrix-cyan/50 text-matrix-cyan bg-matrix-cyan/10 hover:bg-matrix-cyan/20 hover:border-matrix-cyan'}
            `}>
              <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${
                settings.provider === 'anthropic' ? 'bg-matrix-green' : 'bg-matrix-cyan'
              }`} />
              {settings.provider === 'anthropic' ? 'Claude' : 'GPT'}
            </span>
            {/* Tooltip */}
            <div className="absolute top-full left-0 mt-2 px-2 py-1
                            bg-matrix-black/95 border border-matrix-green/30 rounded
                            text-xs font-mono text-matrix-white/80 whitespace-nowrap
                            opacity-0 group-hover/provider:opacity-100 transition-opacity duration-200
                            pointer-events-none z-20">
              {settings.provider === 'anthropic' ? settings.anthropicModel : settings.openaiModel}
            </div>
          </div>

          {/* RAG Mode Badge - shows current/last used mode */}
          {ragMetadata.modeUsed && (
            <RAGModeIndicator
              mode={ragMetadata.modeUsed}
              metrics={ragMetadata.metrics}
              isProcessing={isLoading}
              compact={true}
            />
          )}

          {/* Message count badge */}
          {messages.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono
                           bg-matrix-white/5 border border-matrix-white/10 text-matrix-white/60
                           animate-fade-in">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {messages.length}
            </span>
          )}
        </div>

        {/* Right side: Controls with improved grouping */}
        <div className="flex items-center">
          {/* Primary actions group */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            <UploadButton onUploadComplete={handleUploadComplete} />

            {/* Docs button with active state */}
            <div className="relative group/docs">
              <button
                onClick={() => setShowDocStats(!showDocStats)}
                className={`toolbar-button ${showDocStats ? 'bg-matrix-green/20 border-matrix-green/50 text-matrix-green' : ''}`}
                aria-label="Toggle document statistics"
                aria-pressed={showDocStats}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Docs</span>
                {documentList.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center
                                   bg-matrix-green text-matrix-black text-[10px] font-bold rounded-full
                                   animate-fade-in">
                    {documentList.length}
                  </span>
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 px-2 py-1
                              bg-matrix-black/95 border border-matrix-green/30 rounded
                              text-xs font-mono text-matrix-white/80 whitespace-nowrap
                              opacity-0 group-hover/docs:opacity-100 transition-opacity duration-200
                              pointer-events-none z-20">
                {showDocStats ? 'Hide documents' : 'Show documents'}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-matrix-green/20 mx-1.5 sm:mx-2" />

          {/* Chat actions group */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            {/* Save Chat Button with tooltip */}
            <div className="relative group/save">
              <button
                onClick={exportChat}
                disabled={messages.length === 0}
                className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Save chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Save</span>
              </button>
              {/* Tooltip with shortcut */}
              <div className="absolute top-full right-0 mt-2 px-2 py-1
                              bg-matrix-black/95 border border-matrix-green/30 rounded
                              text-xs font-mono text-matrix-white/80 whitespace-nowrap
                              opacity-0 group-hover/save:opacity-100 transition-opacity duration-200
                              pointer-events-none z-20 flex items-center gap-2">
                <span>Export chat</span>
                <kbd className="px-1.5 py-0.5 bg-matrix-green/10 rounded text-[10px] text-matrix-green">⌘S</kbd>
              </div>
            </div>

            {/* Clear button with tooltip */}
            <div className="relative group/clear">
              <button
                onClick={handleClearClick}
                disabled={messages.length === 0 || isLoading}
                className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed hover:text-red-400 hover:border-red-400/30"
                aria-label="Clear messages"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Clear</span>
              </button>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 px-2 py-1
                              bg-matrix-black/95 border border-matrix-green/30 rounded
                              text-xs font-mono text-matrix-white/80 whitespace-nowrap
                              opacity-0 group-hover/clear:opacity-100 transition-opacity duration-200
                              pointer-events-none z-20">
                Clear conversation
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-matrix-green/20 mx-1.5 sm:mx-2 hidden sm:block" />

          {/* Help & Settings group */}
          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            {/* Guide button with tooltip */}
            <div className="relative group/guide">
              <button
                onClick={() => setShowGuide(true)}
                className="toolbar-button"
                aria-label="Show quick start guide"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Guide</span>
              </button>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 px-2 py-1
                              bg-matrix-black/95 border border-matrix-green/30 rounded
                              text-xs font-mono text-matrix-white/80 whitespace-nowrap
                              opacity-0 group-hover/guide:opacity-100 transition-opacity duration-200
                              pointer-events-none z-20">
                Quick start guide
              </div>
            </div>

            {/* Settings button with tooltip */}
            <div className="relative group/settings">
              <button
                onClick={() => setShowSettings(true)}
                className={`toolbar-button icon-spin-hover ${showSettings ? 'bg-matrix-green/20 border-matrix-green/50 text-matrix-green' : ''}`}
                aria-label="Open settings"
              >
                <svg className="w-4 h-4 transition-transform duration-300 group-hover/settings:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 px-2 py-1
                              bg-matrix-black/95 border border-matrix-green/30 rounded
                              text-xs font-mono text-matrix-white/80 whitespace-nowrap
                              opacity-0 group-hover/settings:opacity-100 transition-opacity duration-200
                              pointer-events-none z-20">
                Configure API keys & preferences
              </div>
            </div>
          </div>

          {/* Mobile settings button (outside group) */}
          <button
            onClick={() => setShowSettings(true)}
            className="toolbar-button sm:hidden ml-1"
            aria-label="Open settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Upload Success Message */}
      {uploadSuccess && (
        <div className="flex-shrink-0 mx-1 p-3 bg-matrix-green/10 border border-matrix-green/50 rounded-md text-matrix-green text-sm animate-fade-in matrix-font">
          {uploadSuccess}
        </div>
      )}

      {/* Main Chat Area - Fixed frame with internal scroll */}
      <div className="flex flex-col md:flex-row flex-1 gap-2 sm:gap-4 min-h-0 overflow-hidden px-1">
        {/* Chat Container */}
        <div className={`flex flex-col flex-1 ${showDocStats ? 'md:flex-1' : 'w-full'} min-h-0`}>
          <GlassPanel className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden min-h-0" noPadding>
            {error && (
              <div className="flex-shrink-0 mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm matrix-font">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {/* Scrollable Message Area */}
            <div
              ref={messageContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-matrix touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {messages.length === 0 ? (
                <EmptyState onSelectPrompt={handlePromptSelect} />
              ) : (
                <MessageList messages={messages} />
              )}
            </div>

            {/* Back to Top Button */}
            <BackToTopButton show={showBackToTop} onClick={scrollToTop} />

            {/* Insight Panel - shows RAG analysis between messages and input */}
            {ragMetadata.analysis && messages.length > 0 && (
              <FloatingInsightPanel
                analysis={ragMetadata.analysis}
                modeUsed={ragMetadata.modeUsed || 'auto'}
                metrics={ragMetadata.metrics}
                wasEscalated={!!ragMetadata.metrics?.escalated_from}
                isProcessing={isLoading}
              />
            )}

            {/* Queued-message indicator: shown when the user sent a message
                while the backend was still warming. The message is held in
                `queuedMessage` and flushed via useChat.append() the moment
                health.status flips to 'ready'. */}
            {queuedMessage && (
              <div
                role="status"
                aria-live="polite"
                className="flex-shrink-0 mt-2 flex items-start gap-2 rounded-v2-sm border border-edge-subtle bg-surface-card px-3 py-2 font-mono text-[11.5px] text-fg-secondary"
              >
                <span
                  aria-hidden
                  className="mt-1 w-1.5 h-1.5 rounded-full bg-mode-amber animate-pulse"
                  style={{ boxShadow: '0 0 6px var(--v2-amber)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-fg-primary">Message queued · sending when backend is ready</div>
                  <div className="mt-0.5 truncate text-fg-muted">{queuedMessage}</div>
                </div>
              </div>
            )}

            {/* Composer (v2): controlled textarea + send button + char counter + kbd hints */}
            <div className="flex-shrink-0 pt-3 sm:pt-4 border-t border-edge-subtle">
              {isLoading ? (
                <ThinkingInputState />
              ) : (
                <Composer
                  ref={inputRef}
                  input={input}
                  handleInputChange={handleInputChange}
                  handleSubmit={handleSubmitWithQueue}
                  isLoading={isLoading}
                  mode={settings.ragMode}
                  onOpenSettings={() => setShowSettings(true)}
                />
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Document Stats Panel */}
        {showDocStats && (
          <div className="flex-shrink-0 w-full md:w-80 slide-in-right flex flex-col gap-3 overflow-y-auto max-h-[40vh] md:max-h-full">
            <DocumentStats refreshTrigger={statsRefreshKey} />

            {/* Document List */}
            {documentList.length > 0 && (
              <GlassPanel className="p-3">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-matrix-green/20">
                  <span className="text-matrix-green font-mono text-xs">&gt;_</span>
                  <span className="text-matrix-white/80 font-mono text-xs uppercase tracking-wider">
                    DOCUMENTS
                  </span>
                </div>
                <ul className="space-y-1">
                  {documentList.map((doc, index) => (
                    <li
                      key={index}
                      className="text-xs text-matrix-white/70 font-mono flex items-center"
                    >
                      <span className="text-matrix-green/50 mr-2">[{String(index + 1).padStart(2, '0')}]</span>
                      <span className="truncate">{doc}</span>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            )}

            {/* System Status - fills remaining space */}
            <SystemStatus isConnected={true} />
          </div>
        )}
      </div>

      {/* Status indicators - compact on mobile */}
      <div className="flex-shrink-0 space-y-1 px-1 pb-1">
        {/* Session initialization indicator */}
        {!isInitialized && (
          <div className="p-2 bg-matrix-green/10 border border-matrix-green/30 rounded-md text-matrix-green text-xs font-mono flex items-center">
            <span className="animate-pulse mr-2">●</span>
            <span>Initializing session...</span>
          </div>
        )}

        {/* Cleanup indicator */}
        {isCleaningUp && (
          <div className="p-2 bg-matrix-cyan/10 border border-matrix-cyan/30 rounded-md text-matrix-cyan text-xs font-mono flex items-center">
            <svg className="w-3 h-3 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Preparing workspace...</span>
          </div>
        )}

        {/* API Key Warning - shows if the selected provider's API key is missing */}
        {((settings.provider === 'anthropic' && !hasAnthropicApiKey()) ||
          (settings.provider === 'openai' && !hasApiKey())) && (
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-400 text-xs font-mono flex items-center justify-between">
            <span>
              No API key for {settings.provider === 'anthropic' ? 'Claude' : 'GPT'}.
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-400 hover:bg-yellow-500/30 transition-colors text-xs"
            >
              Add Key
            </button>
          </div>
        )}
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-2 sm:p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="max-w-4xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <QuickStartGuide
              onDismiss={() => setShowGuide(false)}
              onOpenSettings={() => {
                setShowGuide(false);
                setShowSettings(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Clear Confirmation Dialog */}
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
