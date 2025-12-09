'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
import DocumentStats from '../Documents/DocumentStats';
import UploadButton from '../Documents/UploadButton';
import GlassPanel from '../UI/GlassPanel';
import Settings from '../Settings/Settings';
import QuickStartGuide from '../Onboarding/QuickStartGuide';
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

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const handleDismissGuide = useCallback(() => {
    localStorage.setItem('quickStartGuideDismissed', 'true');
    setGuideDismissed(true);
    setShowGuide(false);
  }, []);

  const handleUploadComplete = useCallback(async (response: DocumentUploadResponse) => {
    setUploadSuccess(`✓ Uploaded "${response.document_id}" - ${response.chunks_created} chunks created`);
    setShowDocStats(true);

    // Give backend time to finish indexing, then refresh stats
    setTimeout(() => {
      setStatsRefreshKey(prev => prev + 1);
    }, 500);

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
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
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
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Docs</span>
          </button>

          <button
            onClick={clearMessages}
            disabled={messages.length === 0 || isLoading}
            className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear</span>
          </button>

          <div className="w-px h-5 bg-matrix-green/20 mx-1" />

          <button
            onClick={() => setShowGuide(true)}
            className="toolbar-button"
            title="Quick start guide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Guide</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="toolbar-button icon-spin-hover"
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
        <div className="p-3 bg-matrix-green/10 border border-matrix-green/50 rounded-md text-matrix-green text-sm animate-fade-in matrix-font">
          {uploadSuccess}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0">
        {/* Chat Messages */}
        <div className={showDocStats ? 'flex-1 min-h-[400px]' : 'w-full'}>
          <GlassPanel className="h-full flex flex-col p-5" noPadding>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm matrix-font">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {/* Quick Start Guide or Morpheus Quote */}
            {messages.length === 0 && !guideDismissed && (
              <QuickStartGuide
                onDismiss={handleDismissGuide}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}

            {messages.length === 0 && guideDismissed && (
              <div className="text-center py-12 text-matrix-green/70">
                <p className="matrix-quote text-lg mb-4 inline-block text-left max-w-md mx-auto">
                  &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
                </p>
                <p className="text-sm opacity-60 mt-4 font-mono">
                  Upload documents and ask me anything...
                </p>
              </div>
            )}

            <MessageList
              messages={messages}
              isLoading={isLoading}
              className="flex-1"
            />

            <div className="mt-4 pt-4 border-t border-matrix-green/20">
              {/* Use Vercel AI SDK's form submission */}
              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <div className="flex-1 relative group">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Ask me about your documents..."
                    rows={1}
                    className="matrix-input resize-none min-h-[48px] max-h-[120px] pr-16 w-full
                               focus:ring-2 focus:ring-matrix-green/40 focus:border-matrix-green
                               focus:shadow-[0_0_20px_rgba(0,255,0,0.15)]
                               transition-all duration-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-matrix-white/30 font-mono
                                   group-focus-within:text-matrix-green/50 transition-colors">
                    {input.length}/2000
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-3 bg-matrix-green text-matrix-black rounded-md
                             font-mono text-sm font-bold uppercase tracking-wider
                             hover:bg-matrix-cyan hover:shadow-[0_0_25px_rgba(0,255,255,0.4)]
                             active:scale-95
                             transition-all duration-200
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending
                    </span>
                  ) : 'Send'}
                </button>
              </form>
            </div>
          </GlassPanel>
        </div>

        {/* Document Stats Panel */}
        {showDocStats && (
          <div className="w-full md:w-96 slide-in-right space-y-4">
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
                      <span className="text-matrix-green mr-2">📄</span>
                      {doc}
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            )}
          </div>
        )}
      </div>

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
          <span className="animate-spin mr-2">⟳</span>
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

      {/* Guide Modal */}
      {showGuide && (
        <div
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
    </div>
  );
}
