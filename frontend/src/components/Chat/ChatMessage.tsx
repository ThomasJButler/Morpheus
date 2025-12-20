'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import CitationHighlight from '../Context/CitationHighlight';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Compact SVG Icon components
function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function MorpheusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
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
      group relative my-2 sm:my-3 p-3 sm:p-4 rounded-lg transition-all duration-250
      message-appear border-l-2
      ${isUser
        ? 'bg-matrix-black/40 border-l-matrix-cyan ml-2 sm:ml-8 hover:bg-matrix-black/50'
        : 'bg-matrix-black/60 border-l-matrix-green mr-2 sm:mr-8 hover:bg-matrix-black/70 hover:shadow-[0_0_15px_rgba(0,255,0,0.2)]'}
    `}>
      {/* Copy Button - top right */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2
                   opacity-70 sm:opacity-0 sm:group-hover:opacity-100
                   transition-opacity duration-200
                   p-1.5 rounded-md
                   bg-matrix-black/50 hover:bg-matrix-green/20
                   text-matrix-green/60 hover:text-matrix-green
                   min-w-[32px] min-h-[32px] flex items-center justify-center"
        title="Copy message"
        aria-label={copied ? 'Copied!' : 'Copy message'}
      >
        {copied ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Header with icon + name inline */}
      <div className="flex items-center gap-2 mb-2 pr-10">
        <div className={`
          flex-shrink-0 w-6 h-6 rounded flex items-center justify-center
          ${isUser ? 'bg-matrix-cyan/20 text-matrix-cyan' : 'bg-matrix-green/20 text-matrix-green'}
        `}>
          {isUser ? <UserIcon /> : <MorpheusIcon />}
        </div>
        <span className={`text-xs font-mono font-bold ${isUser ? 'text-matrix-cyan' : 'text-matrix-green'}`}>
          {isUser ? 'You' : 'Morpheus'}
        </span>
        {message.confidence && (
          <span className="text-xs text-matrix-white/40">
            {Math.round(message.confidence * 100)}%
          </span>
        )}
        {message.timestamp && (
          <span className="ml-auto text-xs text-matrix-white/30">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Content - full width */}
      <div className={`text-sm sm:text-base leading-relaxed break-words overflow-wrap-anywhere ${isUser ? 'text-matrix-white' : 'text-matrix-green-dim'}`}>
        {message.content ? (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-matrix-green">{children}</strong>,
              em: ({ children }) => <em className="italic text-matrix-cyan">{children}</em>,
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1 py-0.5 bg-matrix-black/60 border border-matrix-green/30 rounded text-matrix-cyan font-mono text-xs sm:text-sm break-all">
                    {children}
                  </code>
                ) : (
                  <code className={`${className} break-all whitespace-pre-wrap`}>{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-2 p-3 bg-matrix-black/80 border border-matrix-green/30 rounded-lg overflow-x-auto font-mono text-xs">
                  {children}
                </pre>
              ),
              ul: ({ children }) => <ul className="my-2 ml-4 list-disc list-inside space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-4 list-decimal list-inside space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-matrix-white/90">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-bold text-matrix-green mt-3 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold text-matrix-green mt-2 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold text-matrix-green mt-2 mb-1">{children}</h3>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-matrix-cyan underline hover:text-matrix-green transition-colors break-all">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-2 pl-3 border-l-2 border-matrix-cyan/50 text-matrix-white/70 italic">
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
        <div className="mt-3 pt-2 border-t border-matrix-green/20">
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="text-xs text-matrix-green hover:text-matrix-cyan transition-colors font-mono flex items-center gap-1 py-1"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showCitations ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
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
        <div className="mt-2 text-xs text-matrix-white/30 font-mono flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {message.metadata.processingTime}ms
        </div>
      )}
    </div>
  );
}
