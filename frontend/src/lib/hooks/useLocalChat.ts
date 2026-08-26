'use client';

import { useCallback, useRef, useState } from 'react';
import { apiClient } from '../api-client';
import type { ChatMessage, RetrievalMode, StreamEvent } from '../types';

export interface SendOptions {
  mode: RetrievalMode;
  deep: boolean;
  model?: string | null;
}

/**
 * Chat over the backend's SSE stream. Replaces the Vercel AI SDK hook: the
 * important difference is that `citation` and `done` events land on the
 * message itself, so the citations panel finally has data (the old BFF only
 * ever forwarded a count, SECURITY_REVIEW F2).
 */
export function useLocalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const patchMessage = useCallback(
    (id: string, patch: (message: ChatMessage) => ChatMessage) => {
      setMessages((previous) =>
        previous.map((message) => (message.id === id ? patch(message) : message)),
      );
    },
    [],
  );

  const send = useCallback(
    (content: string, options: SendOptions) => {
      const text = content.trim();
      if (!text) return;
      setError(null);
      setIsLoading(true);

      const now = Date.now();
      const assistantId = `msg-${now + 1}`;
      setMessages((previous) => [
        ...previous,
        { id: `msg-${now}`, role: 'user', content: text, timestamp: new Date() },
        { id: assistantId, role: 'assistant', content: '', citations: [], timestamp: new Date() },
      ]);

      const finish = () => {
        setIsLoading(false);
        abortRef.current = null;
      };

      abortRef.current = apiClient.streamChat(
        { message: text, mode: options.mode, deep: options.deep, model: options.model ?? null },
        (event: StreamEvent) => {
          if (event.type === 'token' && event.content) {
            patchMessage(assistantId, (m) => ({ ...m, content: m.content + event.content }));
          } else if (event.type === 'citation' && event.citation) {
            const citation = event.citation;
            patchMessage(assistantId, (m) => ({
              ...m,
              citations: [...(m.citations ?? []), citation],
            }));
          } else if (event.type === 'done' && event.done) {
            const done = event.done;
            patchMessage(assistantId, (m) => ({ ...m, done }));
          } else if (event.type === 'error') {
            setError(event.message || 'Something went wrong.');
            // Drop the empty placeholder so a failed request doesn't leave
            // a blank assistant bubble behind.
            setMessages((previous) =>
              previous.filter((m) => m.id !== assistantId || m.content !== ''),
            );
          }
        },
        (streamError: Error) => {
          setError(streamError.message);
          setMessages((previous) =>
            previous.filter((m) => m.id !== assistantId || m.content !== ''),
          );
          finish();
        },
        finish,
      );
    },
    [patchMessage],
  );

  const stop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    setError(null);
  }, [stop]);

  return { messages, setMessages, isLoading, error, send, stop, clear };
}
