'use client';

import { useState, useCallback } from 'react';
import MessageList from './MessageList';
import InputBar from './InputBar';
import ModeSelector from './ModeSelector';
import RetrievalMetrics from '../Context/RetrievalMetrics';
import DocumentStats from '../Documents/DocumentStats';
import UploadButton from '../Documents/UploadButton';
import GlassPanel from '../UI/GlassPanel';
import { useChat } from '@/lib/hooks/useChat';
import { RAGMode, DocumentUploadResponse } from '@/lib/types';

export default function ChatInterface() {
  const [selectedMode, setSelectedMode] = useState<RAGMode>('hybrid');
  const [showMetrics, setShowMetrics] = useState(false);
  const [showDocStats, setShowDocStats] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    currentMetrics,
  } = useChat();

  const handleSendMessage = useCallback(
    async (message: string) => {
      await sendMessage(message, selectedMode);
    },
    [sendMessage, selectedMode]
  );

  const handleUploadComplete = useCallback((response: DocumentUploadResponse) => {
    setUploadSuccess(`✓ Uploaded: ${response.chunks_created} chunks created`);
    setShowDocStats(true);

    // Clear success message after 5 seconds
    setTimeout(() => {
      setUploadSuccess(null);
    }, 5000);
  }, []);

  return (
    <div className="flex flex-col h-[80vh] max-h-[800px] space-y-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <ModeSelector
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          disabled={isLoading}
        />

        <div className="flex items-center space-x-4">
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
        </div>
      </div>

      {/* Upload Success Message */}
      {uploadSuccess && (
        <div className="p-3 bg-matrix-green/10 border border-matrix-green/50 rounded-md text-matrix-green text-sm animate-fade-in">
          {uploadSuccess}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Chat Messages */}
        <div className={showMetrics || showDocStats ? 'flex-1' : 'w-full'}>
          <GlassPanel className="h-full flex flex-col p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}

            <MessageList
              messages={messages}
              isLoading={isLoading}
              className="flex-1"
            />

            <div className="mt-4">
              <InputBar
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                placeholder={`Ask anything... (${selectedMode} mode)`}
              />
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
    </div>
  );
}