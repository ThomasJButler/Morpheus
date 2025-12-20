'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
import DocumentStats from '../Documents/DocumentStats';
import UploadButton from '../Documents/UploadButton';
import GlassPanel from '../UI/GlassPanel';
import Settings from '../Settings/Settings';
import QuickStartGuide from '../Onboarding/QuickStartGuide';
import BackToTopButton from '../UI/BackToTopButton';
import ConfirmDialog from '../UI/ConfirmDialog';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSession } from '@/lib/hooks/useSession';
import { apiClient } from '@/lib/api-client';
import { DocumentUploadResponse } from '@/lib/types';

export default function ChatInterface() {
  const [showDocStats, setShowDocStats] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [documentList, setDocumentList] = useState<string[]>([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  // Load guide dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('quickStartGuideDismissed') === 'true';
    setGuideDismissed(dismissed);
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
    },
    onFinish: async (message) => {
      console.log('✅ Stream finished:', message.content.substring(0, 50));
    },
    onError: (error) => {
      console.error('❌ Stream error:', error);
    },
  });

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
  }, [messages]);

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

  const handleClearClick = useCallback(() => {
    if (messages.length > 0) {
      setShowClearConfirm(true);
    }
  }, [messages.length]);

  const confirmClear = useCallback(() => {
    setMessages([]);
    setShowClearConfirm(false);
  }, [setMessages]);

  const handleDismissGuide = useCallback(() => {
    localStorage.setItem('quickStartGuideDismissed', 'true');
    setGuideDismissed(true);
    setShowGuide(false);
  }, []);

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
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-1 py-2">
        {/* Provider Badge */}
        <div className="flex items-center space-x-2">
          <span className={`
            inline-flex items-center px-3 py-1 rounded-full text-xs font-mono
            border transition-all duration-200
            ${settings.provider === 'anthropic'
              ? 'border-matrix-green/50 text-matrix-green bg-matrix-green/10'
              : 'border-matrix-cyan/50 text-matrix-cyan bg-matrix-cyan/10'}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${
              settings.provider === 'anthropic' ? 'bg-matrix-green' : 'bg-matrix-cyan'
            }`} />
            {settings.provider === 'anthropic' ? 'Claude' : 'GPT'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-1">
          <UploadButton onUploadComplete={handleUploadComplete} />

          <button
            onClick={() => setShowDocStats(!showDocStats)}
            className="toolbar-button"
            aria-label="Toggle document statistics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Docs</span>
          </button>

          {/* Save Chat Button */}
          <button
            onClick={exportChat}
            disabled={messages.length === 0}
            className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed"
            title="Save chat (Cmd+S)"
            aria-label="Save chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Save</span>
          </button>

          <button
            onClick={handleClearClick}
            disabled={messages.length === 0 || isLoading}
            className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Clear messages"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear</span>
          </button>

          <div className="w-px h-5 bg-matrix-green/20 mx-1 hidden sm:block" />

          <button
            onClick={() => setShowGuide(true)}
            className="toolbar-button hidden sm:inline-flex"
            title="Quick start guide"
            aria-label="Show quick start guide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Guide</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="toolbar-button icon-spin-hover"
            aria-label="Open settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
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
              className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-matrix"
            >
              {/* Enhanced Empty State */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
                  <div className="max-w-md space-y-6">
                    <p className="matrix-quote text-base sm:text-lg text-matrix-green/70 italic">
                      &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
                    </p>

                    <div className="space-y-3 text-left">
                      <p className="text-sm font-mono text-matrix-green font-semibold">Get started:</p>
                      <ol className="space-y-2 text-sm text-matrix-white/80">
                        <li className="flex items-start gap-2">
                          <span className="text-matrix-green">1.</span>
                          <span>Upload documents using the button above</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-matrix-cyan">2.</span>
                          <span>Ask questions about your content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-matrix-green">3.</span>
                          <span>Get AI-powered answers with sources</span>
                        </li>
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-matrix-green/20">
                      <p className="text-xs text-matrix-white/60 font-mono mb-2">Try asking:</p>
                      <div className="space-y-1.5 text-xs">
                        <button
                          onClick={() => {
                            const textarea = inputRef.current;
                            if (textarea) {
                              textarea.value = "What is this document about?";
                              textarea.dispatchEvent(new Event('input', { bubbles: true }));
                              textarea.focus();
                            }
                          }}
                          className="block w-full text-left px-3 py-2 rounded bg-matrix-green/10 hover:bg-matrix-green/20 text-matrix-green border border-matrix-green/30 transition-colors"
                        >
                          "What is this document about?"
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
                          className="block w-full text-left px-3 py-2 rounded bg-matrix-cyan/10 hover:bg-matrix-cyan/20 text-matrix-cyan border border-matrix-cyan/30 transition-colors"
                        >
                          "Summarize the key points"
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <MessageList
                messages={messages}
                isLoading={isLoading}
                className="flex-1"
              />
            </div>

            {/* Back to Top Button */}
            <BackToTopButton show={showBackToTop} onClick={scrollToTop} />

            {/* Fixed Input Area */}
            <div className="flex-shrink-0 pt-3 sm:pt-4 border-t border-matrix-green/20 bg-transparent">
              <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
                <div className="flex-1 relative group">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
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
                  disabled={isLoading || !input.trim()}
                  className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 bg-matrix-green text-matrix-black rounded-md
                             font-mono text-sm font-bold uppercase tracking-wider
                             hover:bg-matrix-cyan hover:shadow-[0_0_25px_rgba(0,255,255,0.4)]
                             active:scale-95
                             transition-all duration-200
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
                             min-h-[44px] min-w-[44px]"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="hidden sm:inline">Sending</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="hidden sm:inline">Send</span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </GlassPanel>
        </div>

        {/* Document Stats Panel */}
        {showDocStats && (
          <div className="flex-shrink-0 w-full md:w-96 slide-in-right space-y-4 overflow-y-auto max-h-[40vh] md:max-h-full">
            <DocumentStats refreshTrigger={statsRefreshKey} />

            {/* Document List */}
            {documentList.length > 0 && (
              <GlassPanel className="p-4">
                <h3 className="text-sm font-mono text-matrix-green mb-3">
                  Uploaded Documents
                </h3>
                <ul className="space-y-2">
                  {documentList.map((doc, index) => (
                    <li
                      key={index}
                      className="text-sm text-matrix-white/80 font-mono flex items-center"
                    >
                      <svg className="w-4 h-4 text-matrix-green mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate">{doc}</span>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            )}
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
