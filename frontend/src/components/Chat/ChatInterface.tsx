'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChat, Message } from 'ai/react';
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

interface SavedChat {
  id: string;
  name: string;
  messages: Message[];
  savedAt: string;
}

export default function ChatInterface() {
  const [showDocStats, setShowDocStats] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [documentList, setDocumentList] = useState<string[]>([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [showSavedChats, setShowSavedChats] = useState(false);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  // Load saved chats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('morpheus-saved-chats');
    if (saved) {
      try {
        setSavedChats(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved chats:', e);
      }
    }
  }, []);

  // Save current chat
  const handleSaveChat = useCallback(() => {
    if (messages.length === 0) return;

    const firstMessage = messages[0]?.content || 'New Chat';
    const chatName = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');

    const newChat: SavedChat = {
      id: Date.now().toString(),
      name: chatName,
      messages: messages,
      savedAt: new Date().toISOString(),
    };

    const updatedChats = [newChat, ...savedChats].slice(0, 20); // Keep max 20 chats
    setSavedChats(updatedChats);
    localStorage.setItem('morpheus-saved-chats', JSON.stringify(updatedChats));

    setSaveMessage('Chat saved!');
    setTimeout(() => setSaveMessage(null), 2000);
  }, [messages, savedChats]);

  // Load a saved chat
  const handleLoadChat = useCallback((chat: SavedChat) => {
    setMessages(chat.messages);
    setShowSavedChats(false);
  }, [setMessages]);

  // Delete a saved chat
  const handleDeleteChat = useCallback((chatId: string) => {
    const updatedChats = savedChats.filter(c => c.id !== chatId);
    setSavedChats(updatedChats);
    localStorage.setItem('morpheus-saved-chats', JSON.stringify(updatedChats));
  }, [savedChats]);

  // Export chat as text file
  const handleExportChat = useCallback(() => {
    if (messages.length === 0) return;

    const chatText = messages.map(m => {
      const role = m.role === 'user' ? 'You' : 'Morpheus';
      return `${role}:\n${m.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morpheus-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

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

          {/* Save Chat Button */}
          <button
            onClick={handleSaveChat}
            disabled={messages.length === 0}
            className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed"
            title="Save chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Save</span>
          </button>

          {/* Load Saved Chats Button */}
          <button
            onClick={() => setShowSavedChats(true)}
            className="toolbar-button relative"
            title="Load saved chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span>History</span>
            {savedChats.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-matrix-green text-matrix-black text-xs rounded-full flex items-center justify-center font-bold">
                {savedChats.length}
              </span>
            )}
          </button>

          {/* Export Chat Button */}
          <button
            onClick={handleExportChat}
            disabled={messages.length === 0}
            className="toolbar-button disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export chat as text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export</span>
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
        <div className={showDocStats ? 'flex-1 min-h-0' : 'w-full min-h-0'}>
          <GlassPanel className="h-full flex flex-col p-2 sm:p-5 overflow-hidden" noPadding>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm matrix-font flex-shrink-0">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {/* Morpheus Quote - shown when chat is empty */}
            {messages.length === 0 && (
              <div className="text-center py-8 sm:py-12 text-matrix-green/70 flex-shrink-0">
                <p className="matrix-quote text-base sm:text-lg mb-4 inline-block text-left max-w-md mx-auto px-4">
                  &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
                </p>
                <p className="text-sm opacity-60 mt-4 font-mono">
                  Upload documents and ask me anything...
                </p>
              </div>
            )}

            {/* Scrollable message area - takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessageList
                messages={messages}
                isLoading={isLoading}
                className="h-full"
              />
            </div>

            {/* Fixed input area at bottom */}
            <div className="flex-shrink-0 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-matrix-green/20">
              {/* Use Vercel AI SDK's form submission */}
              <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
                <div className="flex-1 relative group">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Ask me about your documents..."
                    rows={1}
                    className="matrix-input resize-none min-h-[44px] sm:min-h-[48px] max-h-[100px] sm:max-h-[120px] pr-14 sm:pr-16 w-full
                               focus:ring-2 focus:ring-matrix-green/40 focus:border-matrix-green
                               focus:shadow-[0_0_20px_rgba(0,255,0,0.15)]
                               transition-all duration-300 text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <span className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-xs text-matrix-white/30 font-mono
                                   group-focus-within:text-matrix-green/50 transition-colors">
                    {input.length}/2000
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-matrix-green text-matrix-black rounded-md
                             font-mono text-sm font-bold uppercase tracking-wider
                             hover:bg-matrix-cyan hover:shadow-[0_0_25px_rgba(0,255,255,0.4)]
                             active:scale-95
                             transition-all duration-200
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
                             min-w-[60px] sm:min-w-[80px] flex items-center justify-center"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="hidden sm:inline">Sending</span>
                    </span>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Send</span>
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
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

      {/* Save Message Toast */}
      {saveMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-matrix-green/20 border border-matrix-green/50 rounded-lg text-matrix-green text-sm font-mono backdrop-blur-sm animate-fade-in">
          {saveMessage}
        </div>
      )}

      {/* Saved Chats Modal */}
      {showSavedChats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setShowSavedChats(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassPanel className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-mono text-matrix-green">Saved Chats</h2>
                <button
                  onClick={() => setShowSavedChats(false)}
                  className="p-2 text-matrix-white/60 hover:text-matrix-green transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {savedChats.length === 0 ? (
                <p className="text-matrix-white/60 text-sm font-mono text-center py-8">
                  No saved chats yet. Start a conversation and save it!
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {savedChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="p-3 bg-matrix-black/40 border border-matrix-green/20 rounded-lg hover:border-matrix-green/40 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => handleLoadChat(chat)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm text-matrix-white font-mono line-clamp-2 group-hover:text-matrix-green transition-colors">
                            {chat.name}
                          </p>
                          <p className="text-xs text-matrix-white/40 mt-1">
                            {new Date(chat.savedAt).toLocaleDateString()} - {chat.messages.length} messages
                          </p>
                        </button>
                        <button
                          onClick={() => handleDeleteChat(chat.id)}
                          className="p-2 text-matrix-white/40 hover:text-red-400 transition-colors flex-shrink-0"
                          aria-label="Delete chat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}
