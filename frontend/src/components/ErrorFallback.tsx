'use client';

import React, { ErrorInfo, ReactElement } from 'react';
import GlassPanel from './UI/GlassPanel';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  reloadPage: () => void;
  showDetails?: boolean;
}

/**
 * ErrorFallback Component
 *
 * Matrix-themed error display with glitch effects
 * Provides user-friendly error messages and recovery options
 *
 * Features:
 * - Matrix glitch animation
 * - Error message display
 * - Stack trace (development only)
 * - Reset and reload buttons
 * - Copy error details to clipboard
 */
export function ErrorFallback({
  error,
  errorInfo,
  resetError,
  reloadPage,
  showDetails = false,
}: ErrorFallbackProps): ReactElement {
  const [copied, setCopied] = React.useState(false);

  /**
   * Copy error details to clipboard for bug reports
   */
  const copyErrorDetails = async (): Promise<void> => {
    const errorText = `
Error: ${error?.name || 'Unknown Error'}
Message: ${error?.message || 'No message'}
${error?.stack ? `\nStack Trace:\n${error.stack}` : ''}
${errorInfo?.componentStack ? `\nComponent Stack:${errorInfo.componentStack}` : ''}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div className="min-h-screen bg-matrix-black flex items-center justify-center p-4">
      {/* Matrix glitch overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glitch-overlay" />
      </div>

      {/* Error content */}
      <GlassPanel className="max-w-2xl w-full relative z-10 animate-fadeIn">
        {/* Glitch header */}
        <div className="text-center mb-8">
          <div className="glitch-text mb-4" data-text="SYSTEM ERROR">
            <span className="text-5xl font-mono font-bold text-matrix-green">
              SYSTEM ERROR
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-red-500 animate-pulse">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-mono uppercase tracking-wider">
              Reality Glitch Detected
            </span>
          </div>
        </div>

        {/* Error message */}
        <div className="mb-6">
          <h2 className="text-matrix-green font-mono text-sm mb-2">
            ERROR_MESSAGE:
          </h2>
          <div className="bg-black/50 p-4 rounded border border-matrix-green/20">
            <p className="text-matrix-white font-mono text-sm break-words">
              {error?.message || 'An unexpected error occurred in the Matrix'}
            </p>
          </div>
        </div>

        {/* Morpheus-style message */}
        <div className="mb-8 p-4 border-l-4 border-matrix-cyan bg-matrix-cyan/5">
          <p className="text-matrix-white font-mono text-sm leading-relaxed">
            <span className="text-matrix-cyan font-bold">Morpheus:</span>{' '}
            &quot;Unfortunately, no one can be told what went wrong. You have to see it for yourself.&quot;
            <br />
            <span className="text-matrix-green/70 text-xs mt-2 block">
              The system encountered an anomaly. Choose to reset and try again, or reload the Matrix.
            </span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={resetError}
            className="flex-1 px-6 py-3 bg-matrix-green/20 hover:bg-matrix-green/30 border border-matrix-green text-matrix-green font-mono text-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,255,0,0.3)] focus:outline-none focus:ring-2 focus:ring-matrix-green"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset System
            </span>
          </button>

          <button
            onClick={reloadPage}
            className="flex-1 px-6 py-3 bg-matrix-cyan/20 hover:bg-matrix-cyan/30 border border-matrix-cyan text-matrix-cyan font-mono text-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] focus:outline-none focus:ring-2 focus:ring-matrix-cyan"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reload Matrix
            </span>
          </button>
        </div>

        {/* Copy error details button */}
        <button
          onClick={copyErrorDetails}
          className="w-full px-4 py-2 bg-black/30 hover:bg-black/50 border border-matrix-green/30 text-matrix-green/70 font-mono text-xs transition-colors duration-200 mb-6 focus:outline-none focus:ring-2 focus:ring-matrix-green/50"
        >
          {copied ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Copied to Clipboard
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Error Details
            </span>
          )}
        </button>

        {/* Detailed error info (development only) */}
        {showDetails && (error || errorInfo) && (
          <details className="mt-6">
            <summary className="cursor-pointer text-matrix-green font-mono text-sm mb-3 hover:text-matrix-cyan transition-colors">
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Show Technical Details
              </span>
            </summary>

            <div className="space-y-4">
              {/* Error stack */}
              {error?.stack && (
                <div>
                  <h3 className="text-matrix-green font-mono text-xs mb-2">
                    ERROR_STACK:
                  </h3>
                  <pre className="bg-black/70 p-3 rounded text-xs text-matrix-green/80 font-mono overflow-x-auto border border-matrix-green/20">
                    {error.stack}
                  </pre>
                </div>
              )}

              {/* Component stack */}
              {errorInfo?.componentStack && (
                <div>
                  <h3 className="text-matrix-green font-mono text-xs mb-2">
                    COMPONENT_STACK:
                  </h3>
                  <pre className="bg-black/70 p-3 rounded text-xs text-matrix-cyan/80 font-mono overflow-x-auto border border-matrix-cyan/20">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Help text */}
        <div className="mt-6 pt-6 border-t border-matrix-green/20">
          <p className="text-matrix-green/50 font-mono text-xs text-center">
            If this error persists, please contact support with the error details above.
          </p>
        </div>
      </GlassPanel>

      {/* CSS for glitch effects */}
      <style jsx>{`
        @keyframes glitch {
          0%, 100% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
        }

        @keyframes glitch-overlay {
          0%, 100% {
            opacity: 0;
          }
          10%, 30%, 50%, 70%, 90% {
            opacity: 0.1;
          }
          20%, 40%, 60%, 80% {
            opacity: 0;
          }
        }

        .glitch-text {
          position: relative;
          animation: glitch 1s infinite;
        }

        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
        }

        .glitch-text::before {
          color: #ff00de;
          z-index: -1;
          animation: glitch 0.3s infinite;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
        }

        .glitch-text::after {
          color: #00fff9;
          z-index: -1;
          animation: glitch 0.3s infinite reverse;
          clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
        }

        .glitch-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.05) 0px,
            rgba(0, 255, 0, 0.05) 1px,
            transparent 1px,
            transparent 2px
          );
          animation: glitch-overlay 2s infinite;
          pointer-events: none;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
