'use client';

import { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import CitationHighlight from '../Context/CitationHighlight';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [showCitations, setShowCitations] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`
      my-2 p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200
      flex slide-in-bottom message-glow border
      ${isUser
        ? 'bg-matrix-black/40 border-matrix-cyan/50 ml-8'
        : 'bg-matrix-black/60 border-matrix-green/50 mr-8'}
    `}>
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
          <span className="ml-auto text-xs text-matrix-white/30">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
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