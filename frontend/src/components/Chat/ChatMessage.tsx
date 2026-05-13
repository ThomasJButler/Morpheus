'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import CitationHighlight from '../Context/CitationHighlight';

interface ChatMessageProps {
  message: ChatMessageType;
  index?: number;
}

function UserIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function MorpheusIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  return copied ? (
    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

export default function ChatMessage({ message, index = 0 }: ChatMessageProps) {
  const [showCitations, setShowCitations] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = useCallback(async () => {
    if (!message.content) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const staggerDelay = Math.min(index, 5) * 40;

  return (
    <article
      className={`
        group relative my-2 sm:my-3 px-3 sm:px-4 py-3
        rounded-v2-md
        border border-edge-subtle
        ${isUser ? 'bg-surface-card/60' : 'bg-transparent'}
        slide-in-left
      `}
      style={{ animationDelay: `${staggerDelay}ms` }}
      data-role={message.role}
    >
      {/* Header: avatar + role + metric chips + copy */}
      <header className="flex items-center gap-2 mb-2 pr-9">
        <span
          className={`
            flex-shrink-0 w-6 h-6 rounded-v2-sm
            inline-flex items-center justify-center
            border
            ${isUser
              ? 'bg-mode-cyan/10 text-mode-cyan border-mode-cyan/30'
              : 'bg-accent/10 text-accent border-accent/30'}
          `}
          aria-hidden
        >
          {isUser ? <UserIcon /> : <MorpheusIcon />}
        </span>
        <span
          className={`
            font-mono text-[11px] font-semibold uppercase tracking-[0.18em]
            ${isUser ? 'text-mode-cyan' : 'text-accent'}
          `}
        >
          {isUser ? 'You' : 'Morpheus'}
        </span>

        {/* Metric chips */}
        <div className="flex items-center gap-1.5 ml-auto text-[10px] font-mono text-fg-muted">
          {message.confidence != null && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-edge-subtle bg-surface-card"
              title="Confidence score"
            >
              <span className="w-1 h-1 rounded-full bg-accent" aria-hidden />
              {Math.round(message.confidence * 100)}%
            </span>
          )}
          {message.metadata?.processingTime != null && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-edge-subtle bg-surface-card"
              title="Processing time"
            >
              {message.metadata.processingTime}ms
            </span>
          )}
          {message.timestamp && (
            <time
              className="hidden sm:inline tabular-nums text-fg-faint"
              dateTime={new Date(message.timestamp).toISOString()}
            >
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          )}
        </div>
      </header>

      {/* Copy button (absolute) */}
      <button
        onClick={handleCopy}
        className="
          absolute top-2.5 right-2.5
          opacity-60 sm:opacity-0 sm:group-hover:opacity-100
          transition-opacity
          inline-flex items-center justify-center
          w-7 h-7 rounded-v2-sm
          border border-edge-subtle bg-surface-card
          text-fg-muted hover:text-accent hover:border-edge-default
        "
        title={copied ? 'Copied' : 'Copy message'}
        aria-label={copied ? 'Copied' : 'Copy message'}
      >
        <CopyIcon copied={copied} />
      </button>

      {/* Body: left-border separator on assistant messages */}
      <div
        className={`
          font-geist text-sm sm:text-[15px] leading-relaxed
          text-fg-primary break-words overflow-wrap-anywhere
          ${isUser ? '' : 'border-l-2 border-accent/40 pl-3'}
        `}
      >
        {message.content ? (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-fg-primary">{children}</strong>,
              em: ({ children }) => <em className="italic text-mode-cyan">{children}</em>,
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-surface-card border border-edge-subtle font-mono text-[12.5px] text-mode-cyan break-all">
                    {children}
                  </code>
                ) : (
                  <code className={`${className} break-all whitespace-pre-wrap`}>{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-3 p-3 rounded-v2-sm border border-edge-subtle bg-surface-input overflow-x-auto font-mono text-xs text-fg-secondary">
                  {children}
                </pre>
              ),
              ul: ({ children }) => <ul className="my-2 ml-2 space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-5 space-y-1.5 list-decimal">{children}</ol>,
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-fg-primary">
                  <span className="text-accent mt-1.5 text-[8px]" aria-hidden>▸</span>
                  <span>{children}</span>
                </li>
              ),
              h1: ({ children }) => <h1 className="text-base font-bold text-accent mt-3 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold text-accent mt-3 mb-1.5">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-fg-primary mt-2 mb-1">{children}</h3>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mode-cyan underline decoration-mode-cyan/40 underline-offset-2 hover:decoration-mode-cyan transition-colors break-all"
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-3 pl-3 border-l-2 border-mode-cyan/50 text-fg-secondary italic">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          <span className="inline-flex items-center gap-2 italic text-fg-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden />
            Thinking…
          </span>
        )}
      </div>

      {/* Citations — bordered figure with cyan left-border */}
      {message.citations && message.citations.length > 0 && (
        <figure className="mt-3 rounded-v2-sm border border-edge-subtle bg-surface-card">
          <button
            type="button"
            onClick={() => setShowCitations(!showCitations)}
            className="
              w-full flex items-center gap-2 px-3 py-2
              font-mono text-[11px] text-fg-muted
              hover:text-fg-primary transition-colors
            "
            aria-expanded={showCitations}
          >
            <svg
              className={`w-3 h-3 transition-transform ${showCitations ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>
              {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
            </span>
          </button>
          <div
            className={`
              overflow-hidden transition-all duration-200
              ${showCitations ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="border-l-2 border-mode-cyan/60 mx-3 mb-3 px-3 space-y-2">
              {message.citations.map((citation, idx) => (
                <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  <CitationHighlight citation={citation} index={idx + 1} />
                </div>
              ))}
            </div>
          </div>
        </figure>
      )}
    </article>
  );
}
