'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
import Composer from './Composer';
import EmptyState from './EmptyState';
import UploadButton from '../Documents/UploadButton';
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
import { useAutoHideScrollbar } from '@/lib/hooks/useAutoHideScrollbar';
import { apiClient } from '@/lib/api-client';
import { DocumentUploadResponse, RAGMode, QueryAnalysis, EnhancedRetrievalMetrics, Citation } from '@/lib/types';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [documentList, setDocumentList] = useState<string[]>([]);
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

  // Fade the chat scrollbar after 1s of idle; mobile only shows it during scroll.
  useAutoHideScrollbar(messageContainerRef);

  const { settings, hasApiKey, hasAnthropicApiKey } = useSettings();
  const { sessionId, isInitialized, isCleaningUp } = useSession();

  // Set session ID on API client when it changes
  useEffect(() => {
    if (sessionId) {
      apiClient.setSessionId(sessionId);
    }
  }, [sessionId]);

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

  // Broadcast retrieval metrics + citations to the System panel (Phase 5).
  // Subscribers (SystemPanel's StatusTab/SourcesTab/SystemTab) refresh on
  // this event — same decoupled pattern as Phase 4's docs sync.
  //
  // Key perf detail: the dep array depends on the LAST ASSISTANT MESSAGE
  // ID, not on `messages`. `useChat` from `'ai/react'` mutates `messages`
  // per streamed token; metrics + citations only change when a new
  // assistant response lands. Depending on the id keeps the dispatch to
  // ~once-per-response instead of once-per-token.
  const lastAssistantMessage = messages.findLast?.((m) => m.role === 'assistant');
  const lastAssistantId = lastAssistantMessage?.id ?? null;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const citations =
      lastAssistantMessage && 'citations' in lastAssistantMessage &&
      Array.isArray((lastAssistantMessage as { citations?: unknown }).citations)
        ? ((lastAssistantMessage as { citations: Citation[] }).citations)
        : [];
    window.dispatchEvent(
      new CustomEvent('morpheus:metrics-updated', {
        detail: {
          metrics: ragMetadata.metrics,
          modeUsed: ragMetadata.modeUsed,
          analysis: ragMetadata.analysis,
          citations,
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastAssistantMessage is read but tracked via its stable id
  }, [ragMetadata, lastAssistantId]);

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

  const refreshDocumentList = useCallback(async () => {
    try {
      const listResponse = await apiClient.listDocuments();
      setDocumentList(listResponse.documents || []);
    } catch (error) {
      console.error('Failed to fetch document list:', error);
    }
  }, []);

  // Populate the document count on mount and whenever the indexed set
  // changes — otherwise the "N docs" chip stays empty after a reload or
  // when documents were indexed in another session.
  useEffect(() => {
    refreshDocumentList();
    window.addEventListener('morpheus:documents-changed', refreshDocumentList);
    return () =>
      window.removeEventListener('morpheus:documents-changed', refreshDocumentList);
  }, [refreshDocumentList]);

  const handleUploadComplete = useCallback(async (response: DocumentUploadResponse) => {
    setUploadSuccess(`Uploaded "${response.document_id}" - ${response.chunks_created} chunks created`);

    await refreshDocumentList();

    // Clear success message after 5 seconds
    setTimeout(() => {
      setUploadSuccess(null);
    }, 5000);
  }, [refreshDocumentList]);

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

          {/* Doc count chip — visible at all widths so mobile users keep the
              context indicator even when the Docs toolbar label is hidden. */}
          {documentList.length > 0 && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono
                         border border-matrix-white/15 bg-matrix-white/5 text-matrix-white/70"
              title={`${documentList.length} document${documentList.length === 1 ? '' : 's'} indexed`}
            >
              {documentList.length} {documentList.length === 1 ? 'doc' : 'docs'}
            </span>
          )}

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

        {/* Right side: Chat-action controls grouped alongside the Claude/GPT
            chip and live status — Upload | Save · Clear | Guide · Settings.
            Mobile uses overflow menu for Save/Clear. */}
        <div className="flex items-center">
          {/* Primary actions group */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            <UploadButton onUploadComplete={handleUploadComplete} />

          </div>

          {/* Divider — desktop only; mobile uses overflow menu instead */}
          <div className="hidden sm:block w-px h-6 bg-matrix-green/20 mx-2" />

          {/* Mobile-only overflow menu for Save/Clear (less-used actions) */}
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
                {/* Click-outside catcher */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-hidden
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-40 min-w-[160px]
                             rounded-md border border-edge-default bg-surface-elev
                             shadow-lg overflow-hidden"
                >
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); exportChat(); }}
                    disabled={messages.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left
                               text-sm font-mono text-fg-primary
                               hover:bg-surface-card-hover disabled:opacity-40
                               disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export chat
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); handleClearClick(); }}
                    disabled={messages.length === 0 || isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left
                               text-sm font-mono text-mode-red
                               hover:bg-mode-red/10 disabled:opacity-40
                               disabled:cursor-not-allowed disabled:hover:bg-transparent
                               border-t border-edge-subtle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear conversation
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Chat actions group — desktop only; mobile uses overflow menu */}
          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
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

          {/* Divider — desktop only; mobile hides Guide/Settings */}
          <div className="hidden sm:block w-px h-6 bg-matrix-green/20 mx-2" />

          {/* Help & Settings group */}
          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-matrix-white/5 border border-matrix-white/10">
            <div className="relative group/guide">
              <button
                onClick={() => setShowGuide(true)}
                className="toolbar-button"
                aria-label="Show quick start guide"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden lg:inline">Guide</span>
              </button>
              <div className="absolute top-full right-0 mt-2 px-2 py-1
                              bg-matrix-black/95 border border-matrix-green/30 rounded
                              text-xs font-mono text-matrix-white/80 whitespace-nowrap
                              opacity-0 group-hover/guide:opacity-100 transition-opacity duration-200
                              pointer-events-none z-20">
                Quick start guide
              </div>
            </div>

            <div className="relative group/settings">
              <button
                onClick={() => setShowSettings(true)}
                className="toolbar-button"
                aria-label="Open settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden lg:inline">Settings</span>
              </button>
              <div className="absolute top-full right-0 mt-2 px-2 py-1
                              bg-matrix-black/95 border border-matrix-green/30 rounded
                              text-xs font-mono text-matrix-white/80 whitespace-nowrap
                              opacity-0 group-hover/settings:opacity-100 transition-opacity duration-200
                              pointer-events-none z-20">
                Configure API keys & preferences
              </div>
            </div>
          </div>

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
        <div className="flex flex-col flex-1 w-full min-h-0">
          {/* Chat panel: plain styled div (NOT <GlassPanel>) so the flex chain
              reaches `messageContainerRef`. GlassPanel always wraps its
              children in a non-flex `<div className="relative z-10">`, which
              kills `flex-1` on the message container and makes the area
              unscrollable. The chat panel doesn't need GlassPanel's overlays
              (cornerGlow/scanlines/glow/animatedBorder), so we just apply the
              `.glass-panel` CSS class directly. */}
          <div className="glass-panel relative flex-1 flex flex-col p-2 sm:p-4 overflow-hidden min-h-0">
            {error && (
              <div className="flex-shrink-0 mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm matrix-font">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {/* Message area + InsightPanel overlay wrapper.
                Relative + overflow-hidden contains the absolutely-positioned
                FloatingInsightPanel so it can't slide over the toolbar above
                or the composer below. messageContainerRef is now also
                absolute so the panel can grow upward over messages when
                expanded (anchored at bottom, max-height transition). */}
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

              {/* Back to Top Button — overlays messages */}
              <BackToTopButton show={showBackToTop} onClick={scrollToTop} />

              {/* Insight Panel — animated overlay anchored at the bottom,
                  grows upward when expanded to (nearly) fill the wrapper. */}
              {ragMetadata.analysis && messages.length > 0 && (
                <FloatingInsightPanel
                  analysis={ragMetadata.analysis}
                  modeUsed={ragMetadata.modeUsed || 'auto'}
                  metrics={ragMetadata.metrics}
                  wasEscalated={!!ragMetadata.metrics?.escalated_from}
                  isProcessing={isLoading}
                />
              )}
            </div>

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
          </div>
        </div>

      </div>

      {/* Status strip — single prioritised banner (warn > info > ok) so the
          composer isn't pushed up by 3 stacked rows on mobile during cold start. */}
      {(() => {
        const apiKeyMissing =
          (settings.provider === 'anthropic' && !hasAnthropicApiKey()) ||
          (settings.provider === 'openai' && !hasApiKey());
        if (apiKeyMissing) {
          return (
            <div className="flex-shrink-0 px-1 pb-1">
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-400 text-xs font-mono flex items-center justify-between">
                <span>No API key for {settings.provider === 'anthropic' ? 'Claude' : 'GPT'}.</span>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-400 hover:bg-yellow-500/30 transition-colors text-xs"
                >
                  Add Key
                </button>
              </div>
            </div>
          );
        }
        if (isCleaningUp) {
          return (
            <div className="flex-shrink-0 px-1 pb-1">
              <div className="p-2 bg-matrix-cyan/10 border border-matrix-cyan/30 rounded-md text-matrix-cyan text-xs font-mono flex items-center">
                <svg className="w-3 h-3 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Preparing workspace…</span>
              </div>
            </div>
          );
        }
        if (!isInitialized) {
          return (
            <div className="flex-shrink-0 px-1 pb-1">
              <div className="p-2 bg-matrix-green/10 border border-matrix-green/30 rounded-md text-matrix-green text-xs font-mono flex items-center">
                <span className="animate-pulse mr-2">●</span>
                <span>Initialising session…</span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Guide Modal — QuickStartGuide now wraps itself in <Modal> (Phase 6),
          so we just render it with isOpen instead of a manual overlay. */}
      <QuickStartGuide
        isOpen={showGuide}
        onDismiss={() => setShowGuide(false)}
        onOpenSettings={() => {
          setShowGuide(false);
          setShowSettings(true);
        }}
      />

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
