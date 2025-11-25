'use client';

import React, { Component, ErrorInfo, ReactNode, ReactElement } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Features:
 * - Catches rendering errors in child components
 * - Displays Matrix-themed error UI
 * - Provides reset functionality
 * - Optional error reporting callback
 * - Development mode shows detailed error info
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary onError={(error, errorInfo) => logErrorToService(error, errorInfo)}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details and call optional error handler
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to error reporting service (e.g., Sentry)
    this.reportError(error, errorInfo);
  }

  /**
   * Report error to monitoring service
   * Override or extend this method to integrate with your error tracking service
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private reportError(_error: Error, _errorInfo: ErrorInfo): void {
    // Example: Send to Sentry
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack,
    //       },
    //     },
    //   });
    // }

    // Example: Send to custom API
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     error: {
    //       message: error.message,
    //       stack: error.stack,
    //     },
    //     errorInfo: {
    //       componentStack: errorInfo.componentStack,
    //     },
    //     timestamp: new Date().toISOString(),
    //     userAgent: navigator.userAgent,
    //     url: window.location.href,
    //   }),
    // }).catch((err) => console.error('Failed to report error:', err));

    console.info('Error reported to monitoring service (if configured)');
  }

  /**
   * Reset error boundary state and try to render again
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the entire page as a last resort
   */
  reloadPage = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use default Matrix-themed error fallback
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          reloadPage={this.reloadPage}
          showDetails={showDetails ?? process.env.NODE_ENV === 'development'}
        />
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 * Note: This is a wrapper since hooks can't catch errors directly
 *
 * Usage:
 * ```tsx
 * export default function MyPage() {
 *   return (
 *     <WithErrorBoundary>
 *       <MyComponent />
 *     </WithErrorBoundary>
 *   );
 * }
 * ```
 */
export function WithErrorBoundary({
  children,
  onError,
  fallback,
}: {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
}): ReactElement {
  return (
    <ErrorBoundary onError={onError} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Type definitions for error reporting integrations
 */
export interface ErrorReport {
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  errorInfo: {
    componentStack: string;
  };
  context: {
    timestamp: string;
    userAgent: string;
    url: string;
    appVersion?: string;
  };
}

/**
 * Helper function to format error for reporting
 */
export function formatErrorReport(
  error: Error,
  errorInfo: ErrorInfo
): ErrorReport {
  return {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    errorInfo: {
      componentStack: errorInfo.componentStack || '',
    },
    context: {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
    },
  };
}
