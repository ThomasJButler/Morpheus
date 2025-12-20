'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import CitationHighlight from '../Context/CitationHighlight';

interface ChatMessageProps {
  message: ChatMessageType;
  index?: number; // For staggered animations
}

// Enhanced SVG Icon components
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

// Copy icon component
function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg className="w-3.5 h-3.5 text-matrix-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

export default function ChatMessage({ message, index = 0 }: ChatMessageProps) {
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

  // Calculate stagger delay (cap at 5 for performance)
  const staggerDelay = Math.min(index, 5) * 50;

  return (
    <div
      className={`
        group relative my-2 sm:my-3 p-3 sm:p-4 rounded-lg
        transition-all duration-300 ease-out
        ${isUser ? 'slide-in-left' : 'slide-in-right'}
        border-l-2
        ${isUser
          ? 'bg-matrix-black/40 border-l-matrix-cyan ml-2 sm:ml-8'
          : 'bg-matrix-black/60 border-l-matrix-green mr-2 sm:mr-8'}
        hover:scale-[1.005] hover:shadow-lg
        ${isUser
          ? 'hover:bg-matrix-black/50 hover:shadow-matrix-cyan/10'
          : 'hover:bg-matrix-black/70 hover:shadow-matrix-green/20'}
      `}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      {/* Gradient overlay on hover */}
      <div
        className={`
          absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100
          transition-opacity duration-300 pointer-events-none
          ${isUser
            ? 'bg-gradient-to-r from-matrix-cyan/5 to-transparent'
            : 'bg-gradient-to-r from-matrix-green/5 to-transparent'}
        `}
      />

      {/* Copy Button - enhanced */}
      <button
        onClick={handleCopy}
        className={`
          absolute top-2 right-2 z-10
          opacity-70 sm:opacity-0 sm:group-hover:opacity-100
          transition-all duration-200
          p-1.5 rounded-md
          bg-matrix-black/60 backdrop-blur-sm
          border border-transparent
          hover:border-matrix-green/30 hover:bg-matrix-green/20
          text-matrix-green/60 hover:text-matrix-green
          min-w-[32px] min-h-[32px] flex items-center justify-center
          ${copied ? 'scale-110' : 'scale-100'}
        `}
        title={copied ? 'Copied!' : 'Copy message'}
        aria-label={copied ? 'Copied!' : 'Copy message'}
      >
        <CopyIcon copied={copied} />
      </button>

      {/* Copied toast */}
      {copied && (
        <div className="absolute top-2 right-12 px-2 py-1 text-xs font-mono text-matrix-green bg-matrix-black/90 rounded border border-matrix-green/30 animate-fade-in z-20">
          Copied!
        </div>
      )}

      {/* Header with icon + name */}
      <div className="flex items-center gap-2 mb-2 pr-10 relative z-10">
        <div className={`
          flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
          transition-all duration-200 group-hover:scale-105
          ${isUser
            ? 'bg-matrix-cyan/20 text-matrix-cyan border border-matrix-cyan/30'
            : 'bg-matrix-green/20 text-matrix-green border border-matrix-green/30'}
        `}>
          {isUser ? <UserIcon /> : <MorpheusIcon />}
        </div>
        <span className={`
          text-xs font-mono font-bold tracking-wide uppercase
          ${isUser ? 'text-matrix-cyan' : 'text-matrix-green'}
        `}>
          {isUser ? 'You' : 'Morpheus'}
        </span>
        {message.confidence && (
          <span className="flex items-center gap-1 text-xs text-matrix-white/50">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {Math.round(message.confidence * 100)}%
          </span>
        )}
        {message.timestamp && (
          <span className="ml-auto text-xs text-matrix-white/30 font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Content - full width */}
      <div className={`relative z-10 text-sm sm:text-base leading-relaxed break-words overflow-wrap-anywhere ${isUser ? 'text-matrix-white' : 'text-matrix-green-dim'}`}>
        {message.content ? (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-matrix-green">{children}</strong>,
              em: ({ children }) => <em className="italic text-matrix-cyan">{children}</em>,
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 bg-matrix-black/70 border border-matrix-green/30 rounded text-matrix-cyan font-mono text-xs sm:text-sm break-all">
                    {children}
                  </code>
                ) : (
                  <code className={`${className} break-all whitespace-pre-wrap`}>{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="group/code relative my-3 p-4 bg-matrix-black/80 border border-matrix-green/30 rounded-lg overflow-x-auto font-mono text-xs">
                  {/* Code block header */}
                  <div className="absolute top-0 left-0 right-0 h-6 bg-matrix-green/10 border-b border-matrix-green/20 rounded-t-lg flex items-center px-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500/60" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                      <div className="w-2 h-2 rounded-full bg-green-500/60" />
                    </div>
                    <span className="ml-3 text-[10px] text-matrix-white/40 font-mono">code</span>
                  </div>
                  <div className="pt-4">{children}</div>
                </pre>
              ),
              ul: ({ children }) => <ul className="my-2 ml-4 space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-4 space-y-1.5 list-decimal list-inside">{children}</ol>,
              li: ({ children }) => (
                <li className="text-matrix-white/90 flex items-start gap-2">
                  <span className="text-matrix-green mt-1.5 text-xs">▸</span>
                  <span>{children}</span>
                </li>
              ),
              h1: ({ children }) => <h1 className="text-lg font-bold text-matrix-green mt-4 mb-2 text-glow-green">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold text-matrix-green mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold text-matrix-green mt-2 mb-1">{children}</h3>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-matrix-cyan underline decoration-matrix-cyan/50 underline-offset-2 hover:text-matrix-green hover:decoration-matrix-green transition-colors break-all"
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-3 pl-4 border-l-2 border-matrix-cyan/50 text-matrix-white/70 italic bg-matrix-cyan/5 py-2 pr-3 rounded-r">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          <span className="italic opacity-50 flex items-center gap-2">
            <span className="w-2 h-2 bg-matrix-green rounded-full animate-pulse" />
            Thinking...
          </span>
        )}
      </div>

      {/* Citations */}
      {message.citations && message.citations.length > 0 && (
        <div className="relative z-10 mt-3 pt-3 border-t border-matrix-green/20">
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="group/cite text-xs text-matrix-green hover:text-matrix-cyan transition-colors font-mono flex items-center gap-2 py-1 px-2 -ml-2 rounded hover:bg-matrix-green/10"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${showCitations ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
            </span>
          </button>

          {/* Citations list with smooth expand */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${showCitations ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="space-y-2">
              {message.citations.map((citation, idx) => (
                <div
                  key={idx}
                  className="animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CitationHighlight citation={citation} index={idx + 1} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {message.metadata?.processingTime && (
        <div className="relative z-10 mt-2 text-xs text-matrix-white/30 font-mono flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{message.metadata.processingTime}ms</span>
        </div>
      )}
    </div>
  );
}
