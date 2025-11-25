'use client';

import { useState, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import CitationHighlight from '../Context/CitationHighlight';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [showCitations, setShowCitations] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = useCallback(async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);

  return (
    <div className={`
      group relative my-3 p-4 rounded-lg transition-all duration-300
      flex message-appear border-l-4
      ${isUser
        ? 'bg-matrix-black/40 border-l-matrix-cyan ml-8 hover:bg-matrix-black/50'
        : 'bg-matrix-black/60 border-l-matrix-green mr-8 hover:bg-matrix-black/70 hover:shadow-[0_0_15px_rgba(0,255,0,0.2)]'}
    `}>
      {/* Copy Button - shows on hover */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded bg-matrix-black/50 hover:bg-matrix-green/20 text-matrix-green/60 hover:text-matrix-green"
        title="Copy message"
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Role Icon */}
      <div className={`
        flex-shrink-0 rounded-lg p-2 border-r flex items-center
        ${isUser ? 'border-matrix-cyan/30' : 'border-matrix-green/30'}
      `}>
        <span className="text-2xl">
          {isUser ? '🧑‍💻' : '🤖'}
        </span>
      </div>

      {/* Message Content */}
      <div className="ml-3 flex-1">
        {/* Header */}
        <div className="flex items-center mb-2">
          <span className={`text-xs font-mono font-bold ${isUser ? 'text-matrix-cyan' : 'text-matrix-green'}`}>
            {isUser ? 'You' : 'Morpheus'}
          </span>
          {message.confidence && (
            <span className="ml-2 text-xs text-matrix-white/40">
              {Math.round(message.confidence * 100)}% confident
            </span>
          )}
          {message.timestamp && (
            <span className="ml-auto text-xs text-matrix-white/30">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className={`text-sm whitespace-pre-wrap break-words ${isUser ? 'text-matrix-white' : 'text-matrix-green-dim'}`}>
          {message.content || <span className="italic opacity-50">Thinking...</span>}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-matrix-green/20">
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="text-xs text-matrix-green hover:text-matrix-cyan transition-colors font-mono"
            >
              {showCitations ? '▼' : '▶'} {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
            </button>

            {showCitations && (
              <div className="mt-2 space-y-2">
                {message.citations.map((citation, idx) => (
                  <CitationHighlight key={idx} citation={citation} index={idx + 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {message.metadata?.processingTime && (
          <div className="mt-2 text-xs text-matrix-white/30 font-mono">
            ⚡ {message.metadata.processingTime}ms
          </div>
        )}
      </div>
    </div>
  );
}