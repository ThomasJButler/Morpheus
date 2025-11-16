'use client';

import { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import CitationHighlight from '../Context/CitationHighlight';
import GlassPanel from '../UI/GlassPanel';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [showCitations, setShowCitations] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-appear`}>
      <div className={`max-w-[80%] ${isUser ? 'ml-8' : 'mr-8'}`}>
        {/* Message Header */}
        <div className={`flex items-center mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className={`text-xs font-mono ${isUser ? 'text-matrix-cyan' : 'text-matrix-green'}`}>
            {isUser ? 'You' : 'Morpheus'}
          </span>
          {message.metadata?.mode && (
            <span className="ml-2 text-xs text-matrix-white/40">
              [{message.metadata.mode}]
            </span>
          )}
          {message.confidence && (
            <span className="ml-2 text-xs text-matrix-white/40">
              {Math.round(message.confidence * 100)}% confident
            </span>
          )}
        </div>

        {/* Message Content */}
        <GlassPanel
          variant={isUser ? 'subtle' : 'default'}
          className="p-3"
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-glass-border">
              <button
                onClick={() => setShowCitations(!showCitations)}
                className="text-xs text-matrix-green hover:text-matrix-cyan transition-colors"
              >
                {showCitations ? 'Hide' : 'Show'} {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
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
            <div className="mt-2 text-xs text-matrix-white/30">
              Processed in {message.metadata.processingTime}ms
            </div>
          )}
        </GlassPanel>

        {/* Timestamp */}
        <div className={`mt-1 text-xs text-matrix-white/30 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}