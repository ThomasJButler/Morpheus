'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
import RetrievalMetrics from '../Context/RetrievalMetrics';
import DocumentStats from '../Documents/DocumentStats';
import UploadButton from '../Documents/UploadButton';
import GlassPanel from '../UI/GlassPanel';
import Settings from '../Settings/Settings';
import { useSettings } from '@/lib/hooks/useSettings';
import { DocumentUploadResponse, MetricResult } from '@/lib/types';

export default function ChatInterface() {
  const [showMetrics, setShowMetrics] = useState(false);
  const [showDocStats, setShowDocStats] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<MetricResult | null>(null);
  const prevMessagesLengthRef = useRef(0);

  const { hasApiKey } = useSettings();

  // Use Vercel AI SDK's useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat`,
    onFinish: async (message) => {
      console.log('✅ Stream finished:', message.content.substring(0, 50));
      // Citations will be fetched by useEffect below
    },
    onError: (error) => {
      console.error('❌ Stream error:', error);
    },
  });

  // Fetch citations when new assistant messages arrive
  useEffect(() => {
    const fetchCitations = async () => {
      if (messages.length <= prevMessagesLengthRef.current) return;

      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'assistant') return;

      console.log('📚 Fetching citations for:', lastMessage.content.substring(0, 50));

      try {
        const userMessage = messages[messages.length - 2]?.content || '';
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/context`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: userMessage }),
          }
        );

        const data = await response.json();
        console.log('✅ Citations fetched:', data.count);
        // Citations will be used later when we integrate them into messages
      } catch (error) {
        console.error('Failed to fetch citations:', error);
      }
    };

    fetchCitations();
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentMetrics(null);
  }, [setMessages]);

  const handleUploadComplete = useCallback((response: DocumentUploadResponse) => {
    setUploadSuccess(`✓ Uploaded "${response.document_id}" - ${response.chunks_created} chunks created`);
    setShowDocStats(true);

    // Clear success message after 5 seconds
    setTimeout(() => {
      setUploadSuccess(null);
    }, 5000);
  }, []);

  return (
    <div className="flex flex-col h-[90vh] max-h-[900px] space-y-4">
      {/* Matrix Header */}
      <div className="text-center py-2">
        <h1 className="matrix-font text-matrix-green text-2xl matrix-glow">
          The Matrix has you...
        </h1>
        <p className="matrix-font text-matrix-green-dim text-sm mt-1 opacity-80">
          Follow the white rabbit. Knock, knock, Neo.
        </p>
      </div>

      {/* Top Controls */}
      <div className="flex items-center justify-end space-x-4">
        <UploadButton onUploadComplete={handleUploadComplete} />

          <button
            onClick={() => setShowDocStats(!showDocStats)}
            className="text-matrix-green hover:text-matrix-cyan transition-colors text-sm font-mono"
          >
            {showDocStats ? 'Hide' : 'Show'} Docs
          </button>

          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="text-matrix-green hover:text-matrix-cyan transition-colors text-sm font-mono"
          >
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </button>

        <button
          onClick={clearMessages}
          disabled={messages.length === 0 || isLoading}
          className="text-matrix-green hover:text-matrix-cyan transition-colors text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear Chat
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="text-matrix-green hover:text-matrix-cyan transition-colors text-sm font-mono flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Settings</span>
        </button>
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
          <GlassPanel className="h-full flex flex-col p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm matrix-font">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {/* Morpheus Guidance */}
            {messages.length === 0 && (
              <div className="text-center py-8 text-matrix-green/60 matrix-font">
                <p className="text-lg mb-2">
                  &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
                </p>
                <p className="text-sm opacity-70">
                  Upload documents and ask me anything...
                </p>
              </div>
            )}

            <MessageList
              messages={messages}
              isLoading={isLoading}
              className="flex-1"
            />

            <div className="mt-4">
              {/* Use Vercel AI SDK's form submission */}
              <form onSubmit={handleSubmit} className="flex items-end space-x-2">
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
                        handleSubmit(e as React.FormEvent<HTMLFormElement>);
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
          <div className="w-96">
            <RetrievalMetrics metrics={currentMetrics} />
          </div>
        )}

        {/* Document Stats Panel */}
        {showDocStats && (
          <div className="w-96">
            <DocumentStats />
          </div>
        )}
      </div>

      {/* API Key Warning */}
      {!hasApiKey() && (
        <div className="mt-4 p-3 bg-matrix-green/10 border border-matrix-green/50 rounded-md text-matrix-green text-sm matrix-font">
          <div className="flex items-center justify-between">
            <span>⚠️ No OpenAI API key configured. Please add your API key in Settings to enable chat functionality.</span>
            <button
              onClick={() => setShowSettings(true)}
              className="ml-4 px-3 py-1 bg-matrix-green text-matrix-black rounded-md hover:bg-matrix-cyan transition-colors font-mono text-xs"
            >
              Open Settings
            </button>
          </div>
        </div>
      )}

      {/* Matrix Footer */}
      <div className="text-center py-2 text-matrix-green/40 text-xs matrix-font">
        <p>There is no spoon.</p>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}