'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api-client';
import { useSettings } from './useSettings';
import {
  ChatMessage,
  StreamChunk,
  MetricResult,
} from '../types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<MetricResult | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const { settings } = useSettings();

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat-messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
        })));
      } catch (e) {
        console.error('Failed to load saved messages:', e);
      }
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = `msg-${Date.now() + 1}`;
    const startTime = Date.now();
    const confidence = 0;

    try {
      // Add empty assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        citations: [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Stream the response
      const abort = apiClient.streamChat(
        {
          message: content,
          session_id: sessionId,
          stream: true,
          openai_api_key: settings.openaiApiKey,
          openai_model: settings.openaiModel,
        },
        (chunk: StreamChunk) => {
          console.log('📩 Received chunk:', chunk);
          if (chunk.type === 'token' && chunk.content) {
            console.log('✅ Token chunk with content:', chunk.content);
            // FIX: Use functional state update to append to existing content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk.content }
                  : msg
              )
            );
          } else if (chunk.type === 'citation' && chunk.citation) {
            // FIX: Use functional state update to append to existing citations
            const citation = chunk.citation; // Capture for type narrowing
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, citations: [...(msg.citations || []), citation] }
                  : msg
              )
            );
          } else if (chunk.type === 'done') {
            const processingTime = Date.now() - startTime;

            // Update with final metadata
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      confidence: confidence,
                      metadata: {
                        ...msg.metadata,
                        processingTime,
                      },
                    }
                  : msg
              )
            );

            // Update metrics if available
            if (chunk.metrics) {
              // Convert RetrievalMetrics to MetricResult format for display
              const metricResult: MetricResult = {
                mode: 'simple',
                relevance_score: chunk.metrics.top_score || 0,
                response_time: chunk.metrics.query_time_ms,
                tokens_used: 0, // Not available in RetrievalMetrics
                citations_count: chunk.metrics.num_results,
                confidence: confidence,
              };
              setCurrentMetrics(metricResult);
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error || 'Stream error');
          }
        },
        (error: Error) => {
          console.error('Stream error:', error);
          setError(error.message);
          // Remove empty assistant message on error
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        },
        () => {
          setIsLoading(false);
        }
      );

      // Store abort function for potential cleanup
      return abort;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsLoading(false);
      // Remove empty assistant message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    }
  }, [sessionId, settings.openaiApiKey, settings.openaiModel]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentMetrics(null);
    localStorage.removeItem('chat-messages');
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    currentMetrics,
  };
}