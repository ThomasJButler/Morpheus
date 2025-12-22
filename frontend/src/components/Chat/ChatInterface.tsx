'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
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
import { apiClient } from '@/lib/api-client';
import { DocumentUploadResponse, RAGMode, QueryAnalysis, EnhancedRetrievalMetrics } from '@/lib/types';

export default function ChatInterface() {
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

  // Character count warning color
  const charCountColor = input.length > 1950 ? 'text-red-400' : input.length > 1800 ? 'text-yellow-400' : 'text-matrix-white/30';

  return (
    <div className="flex flex-col h-[100dvh] sm:h-[calc(100vh-140px)] overflow-hidden">
      {/* Enhanced Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-1 py-2 gap-2">
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
      <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0 overflow-hidden px-1">
        {/* Chat Container */}
        <div className={`flex flex-col ${showDocStats ? 'flex-1 min-h-0' : 'w-full'} min-h-0`}>
          <GlassPanel className="h-full flex flex-col p-2 sm:p-4 overflow-hidden" noPadding>
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
              {/* Enhanced Empty State with animations */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-4 sm:py-8 px-4 animate-fade-in">
                  <div className="max-w-lg space-y-4 sm:space-y-8">
                    {/* Animated Logo/Icon */}
                    <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-2 sm:mb-4">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-matrix-green/20 to-matrix-cyan/20 animate-pulse" />
                      <div className="absolute inset-2 rounded-xl bg-matrix-black border border-matrix-green/30 flex items-center justify-center">
                        <svg className="w-7 h-7 sm:w-10 sm:h-10 text-matrix-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {/* Pulse rings */}
                      <div className="absolute inset-0 rounded-2xl border border-matrix-green/30 pulse-ring" />
                    </div>

                    {/* Matrix quote with typewriter style */}
                    <div className="relative">
                      <p className="text-xs sm:text-sm text-matrix-green/80 italic font-mono leading-relaxed">
                        &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
                      </p>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-matrix-green/50 to-transparent" />
                    </div>

                    {/* Steps - animated cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-left">
                      {/* Step 1 */}
                      <div className="group p-2.5 sm:p-3 rounded-lg bg-matrix-black/40 border border-matrix-green/20
                                      hover:border-matrix-green/50 hover:bg-matrix-green/5
                                      transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-matrix-green/10
                                      slide-in-left" style={{ animationDelay: '100ms' }}>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-matrix-green/20 border border-matrix-green/40
                                        flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">
                          <span className="text-matrix-green font-mono font-bold text-[10px] sm:text-xs">1</span>
                        </div>
                        <p className="text-xs sm:text-sm text-matrix-white/90 font-mono">
                          <span className="text-matrix-green font-semibold">Upload</span> your documents
                        </p>
                        <p className="text-[10px] sm:text-xs text-matrix-white/50 mt-0.5">PDF, DOCX, TXT, MD</p>
                      </div>

                      {/* Step 2 */}
                      <div className="group p-2.5 sm:p-3 rounded-lg bg-matrix-black/40 border border-matrix-cyan/20
                                      hover:border-matrix-cyan/50 hover:bg-matrix-cyan/5
                                      transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-matrix-cyan/10
                                      slide-in-left" style={{ animationDelay: '200ms' }}>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-matrix-cyan/20 border border-matrix-cyan/40
                                        flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">
                          <span className="text-matrix-cyan font-mono font-bold text-[10px] sm:text-xs">2</span>
                        </div>
                        <p className="text-xs sm:text-sm text-matrix-white/90 font-mono">
                          <span className="text-matrix-cyan font-semibold">Ask</span> questions
                        </p>
                        <p className="text-[10px] sm:text-xs text-matrix-white/50 mt-0.5">Natural language queries</p>
                      </div>

                      {/* Step 3 */}
                      <div className="group p-2.5 sm:p-3 rounded-lg bg-matrix-black/40 border border-matrix-green/20
                                      hover:border-matrix-green/50 hover:bg-matrix-green/5
                                      transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-matrix-green/10
                                      slide-in-left" style={{ animationDelay: '300ms' }}>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-matrix-green/20 border border-matrix-green/40
                                        flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">
                          <span className="text-matrix-green font-mono font-bold text-[10px] sm:text-xs">3</span>
                        </div>
                        <p className="text-xs sm:text-sm text-matrix-white/90 font-mono">
                          <span className="text-matrix-green font-semibold">Get</span> cited answers
                        </p>
                        <p className="text-[10px] sm:text-xs text-matrix-white/50 mt-0.5">With source references</p>
                      </div>
                    </div>

                    {/* Example prompts - enhanced */}
                    <div className="pt-2 sm:pt-3 border-t border-matrix-green/20">
                      <p className="text-[10px] sm:text-xs text-matrix-white/50 font-mono mb-1.5 sm:mb-2 flex items-center justify-center gap-1">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-matrix-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Quick prompts
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => {
                            const textarea = inputRef.current;
                            if (textarea) {
                              textarea.value = "What is this document about?";
                              textarea.dispatchEvent(new Event('input', { bubbles: true }));
                              textarea.focus();
                            }
                          }}
                          className="group/prompt px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-mono
                                     bg-matrix-green/10 hover:bg-matrix-green/20
                                     text-matrix-green border border-matrix-green/30 hover:border-matrix-green/60
                                     transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-matrix-green/20"
                        >
                          <span className="opacity-60 group-hover/prompt:opacity-100">&quot;</span>
                          What is this document about?
                          <span className="opacity-60 group-hover/prompt:opacity-100">&quot;</span>
                        </button>
                        <button
                          onClick={() => {
                            const textarea = inputRef.current;
                            if (textarea) {
                              textarea.value = "Summarize the key points";
                              textarea.dispatchEvent(new Event('input', { bubbles: true }));
                              textarea.focus();
                            }
                          }}
                          className="group/prompt px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-mono
                                     bg-matrix-cyan/10 hover:bg-matrix-cyan/20
                                     text-matrix-cyan border border-matrix-cyan/30 hover:border-matrix-cyan/60
                                     transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-matrix-cyan/20"
                        >
                          <span className="opacity-60 group-hover/prompt:opacity-100">&quot;</span>
                          Summarize the key points
                          <span className="opacity-60 group-hover/prompt:opacity-100">&quot;</span>
                        </button>
                        <button
                          onClick={() => {
                            const textarea = inputRef.current;
                            if (textarea) {
                              textarea.value = "Find references to...";
                              textarea.dispatchEvent(new Event('input', { bubbles: true }));
                              textarea.focus();
                            }
                          }}
                          className="group/prompt px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-mono
                                     bg-matrix-green/10 hover:bg-matrix-green/20
                                     text-matrix-green border border-matrix-green/30 hover:border-matrix-green/60
                                     transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-matrix-green/20"
                        >
                          <span className="opacity-60 group-hover/prompt:opacity-100">&quot;</span>
                          Find references to...
                          <span className="opacity-60 group-hover/prompt:opacity-100">&quot;</span>
                        </button>
                      </div>
                    </div>

                    {/* Keyboard shortcuts hint */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 text-[10px] font-mono text-matrix-white/30">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-matrix-green/10 rounded text-[10px] text-matrix-green border border-matrix-green/20">⌘K</kbd>
                        <span>focus</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-matrix-green/10 rounded text-[10px] text-matrix-green border border-matrix-green/20">⌘S</kbd>
                        <span>save</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-matrix-green/10 rounded text-[10px] text-matrix-green border border-matrix-green/20">Esc</kbd>
                        <span>close</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <MessageList
                messages={messages}
                className="flex-1"
              />
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

            {/* Fixed Input Area */}
            <div className="flex-shrink-0 pt-3 sm:pt-4 border-t border-matrix-green/20 bg-transparent">
              {isLoading ? (
                <ThinkingInputState />
              ) : (
                <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
                  <div className="flex-1 relative group">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Ask me about your documents... (Cmd+K to focus)"
                      rows={1}
                      maxLength={2000}
                      className="matrix-input resize-none min-h-[44px] sm:min-h-[48px] max-h-[100px] sm:max-h-[120px] pr-14 sm:pr-16 w-full
                                 focus:ring-2 focus:ring-matrix-green/40 focus:border-matrix-green
                                 focus:shadow-[0_0_20px_rgba(0,255,0,0.15)]
                                 transition-all duration-200 text-base"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      aria-label="Chat input"
                    />
                    <span className={`absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-xs font-mono
                                     group-focus-within:text-matrix-green/70 transition-colors ${charCountColor}`}>
                      {input.length}/2000
                      {input.length > 1800 && <span className="ml-1">⚠</span>}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 bg-matrix-green text-matrix-black rounded-md
                               font-mono text-sm font-bold uppercase tracking-wider
                               hover:bg-matrix-cyan hover:shadow-[0_0_25px_rgba(0,255,255,0.4)]
                               active:scale-95
                               transition-all duration-200
                               disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
                               min-h-[44px] min-w-[44px]"
                    aria-label="Send message"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="hidden sm:inline">Send</span>
                    </span>
                  </button>
                </form>
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
