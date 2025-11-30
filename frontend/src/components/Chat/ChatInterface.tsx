'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
import RetrievalMetrics from '../Context/RetrievalMetrics';
import DocumentStats from '../Documents/DocumentStats';
import UploadButton from '../Documents/UploadButton';
import GlassPanel from '../UI/GlassPanel';
import Settings from '../Settings/Settings';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSession } from '@/lib/hooks/useSession';
import { apiClient } from '@/lib/api-client';
import { DocumentUploadResponse, MetricResult } from '@/lib/types';

export default function ChatInterface() {
  const [showMetrics, setShowMetrics] = useState(false);
  const [showDocStats, setShowDocStats] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<MetricResult | null>(null);
  const [documentList, setDocumentList] = useState<string[]>([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

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
    setCurrentMetrics(null);
  }, [setMessages]);

  const handleUploadComplete = useCallback(async (response: DocumentUploadResponse) => {
    setUploadSuccess(`✓ Uploaded "${response.document_id}" - ${response.chunks_created} chunks created`);
    setShowDocStats(true);
    
    // Trigger stats refresh
    setStatsRefreshKey(prev => prev + 1);
    
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
            onClick={() => setShowMetrics(!showMetrics)}
            className="toolbar-button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Metrics</span>
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
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Chat Messages */}
        <div className={showMetrics || showDocStats ? 'flex-1' : 'w-full'}>
          <GlassPanel className="h-full flex flex-col p-5" noPadding>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm matrix-font">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {/* Morpheus Guidance */}
            {messages.length === 0 && (
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

            <div className="mt-2 pt-2 border-t border-matrix-green/20">
              {/* Use Vercel AI SDK's form submission */}
              <form onSubmit={handleSubmit} className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Ask me about your documents..."
                    rows={1}
                    className="matrix-input resize-none min-h-[40px] max-h-[120px] pr-12 w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-matrix-white/30">
                    {input.length}/2000
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-4 py-2 bg-matrix-green text-matrix-black rounded-md hover:bg-matrix-cyan transition-colors font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </GlassPanel>
        </div>

        {/* Metrics Panel */}
        {showMetrics && currentMetrics && (
          <div className="w-96 slide-in-right">
            <RetrievalMetrics metrics={currentMetrics} />
          </div>
        )}

        {/* Document Stats Panel */}
        {showDocStats && (
          <div className="w-96 slide-in-right space-y-4">
            <DocumentStats key={statsRefreshKey} />
            
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

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
