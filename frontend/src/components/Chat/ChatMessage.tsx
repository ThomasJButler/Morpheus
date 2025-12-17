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
      flex message-appear border-l-2 max-w-full
      ${isUser
        ? 'bg-matrix-black/40 border-l-matrix-cyan ml-4 sm:ml-12 hover:bg-matrix-black/50'
        : 'bg-matrix-black/60 border-l-matrix-green mr-4 sm:mr-12 hover:bg-matrix-black/70 hover:shadow-[0_0_15px_rgba(0,255,0,0.2)]'}
    `}>
      {/* Copy Button - always visible on mobile, hover on desktop */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 sm:top-3 sm:right-3
                   opacity-60 sm:opacity-0 sm:group-hover:opacity-100
                   transition-opacity duration-200 p-2 rounded-md
                   bg-matrix-black/50 hover:bg-matrix-green/20 active:bg-matrix-green/30
                   text-matrix-green/60 hover:text-matrix-green
                   min-w-[40px] min-h-[40px] flex items-center justify-center"
        title="Copy message"
        aria-label={copied ? "Copied!" : "Copy message"}
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

      {/* Role Icon - Using SVG instead of emoji to prevent stretching on mobile */}
      <div className={`
        flex-shrink-0 rounded-lg p-2 sm:p-3 border-r flex items-center justify-center
        w-10 h-10 sm:w-12 sm:h-12
        ${isUser ? 'border-matrix-cyan/30' : 'border-matrix-green/30'}
      `}>
        {isUser ? (
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-matrix-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-matrix-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className="ml-4 flex-1 min-w-0 overflow-hidden">
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
        <div className={`text-base leading-relaxed break-words overflow-wrap-anywhere prose-matrix ${isUser ? 'text-matrix-white' : 'text-matrix-green-dim'}`}>
          {message.content ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-matrix-green">{children}</strong>,
                em: ({ children }) => <em className="italic text-matrix-cyan">{children}</em>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="px-1.5 py-0.5 bg-matrix-black/60 border border-matrix-green/30 rounded text-matrix-cyan font-mono text-sm break-all">
                      {children}
                    </code>
                  ) : (
                    <code className={`${className} break-all whitespace-pre-wrap`}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-3 p-4 bg-matrix-black/80 border border-matrix-green/30 rounded-lg overflow-x-auto font-mono text-xs sm:text-sm max-w-full">
                    {children}
                  </pre>
                ),
                ul: ({ children }) => <ul className="my-2 ml-4 list-disc list-inside space-y-1 break-words">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal list-inside space-y-1 break-words">{children}</ol>,
                li: ({ children }) => <li className="text-matrix-white/90 break-words">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold text-matrix-green mt-4 mb-2 break-words">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold text-matrix-green mt-3 mb-2 break-words">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold text-matrix-green mt-2 mb-1 break-words">{children}</h3>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-matrix-cyan underline hover:text-matrix-green transition-colors break-all">
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