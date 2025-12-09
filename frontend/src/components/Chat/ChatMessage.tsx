'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
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
      group relative my-4 p-5 rounded-lg transition-all duration-300
      flex message-appear border-l-2
      ${isUser
        ? 'bg-matrix-black/40 border-l-matrix-cyan ml-12 hover:bg-matrix-black/50'
        : 'bg-matrix-black/60 border-l-matrix-green mr-12 hover:bg-matrix-black/70 hover:shadow-[0_0_15px_rgba(0,255,0,0.2)]'}
    `}>
      {/* Copy Button - shows on hover */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-md bg-matrix-black/50 hover:bg-matrix-green/20 text-matrix-green/60 hover:text-matrix-green"
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
        flex-shrink-0 rounded-lg p-3 border-r flex items-center
        ${isUser ? 'border-matrix-cyan/30' : 'border-matrix-green/30'}
      `}>
        <span className="text-3xl">
          {isUser ? '🧑‍💻' : '🤖'}
        </span>
      </div>

      {/* Message Content */}
      <div className="ml-4 flex-1">
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
        <div className={`text-base leading-relaxed break-words prose-matrix ${isUser ? 'text-matrix-white' : 'text-matrix-green-dim'}`}>
          {message.content ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-matrix-green">{children}</strong>,
                em: ({ children }) => <em className="italic text-matrix-cyan">{children}</em>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="px-1.5 py-0.5 bg-matrix-black/60 border border-matrix-green/30 rounded text-matrix-cyan font-mono text-sm">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-3 p-4 bg-matrix-black/80 border border-matrix-green/30 rounded-lg overflow-x-auto font-mono text-sm">
                    {children}
                  </pre>
                ),
                ul: ({ children }) => <ul className="my-2 ml-4 list-disc list-inside space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal list-inside space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-matrix-white/90">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold text-matrix-green mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold text-matrix-green mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold text-matrix-green mt-2 mb-1">{children}</h3>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-matrix-cyan underline hover:text-matrix-green transition-colors">
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-3 pl-4 border-l-2 border-matrix-cyan/50 text-matrix-white/70 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <span className="italic opacity-50">Thinking...</span>
          )}
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