import {
  ChatRequest,
  ChatResponse,
  DocumentUploadResponse,
  DocumentStats,
  StreamChunk,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private baseURL: string;
  private sessionId: string | null = null;

  constructor() {
    this.baseURL = API_URL;
  }

  // Set session ID for all subsequent requests
  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    console.log('🔑 API client session set:', sessionId);
  }

  // Get session headers
  private getSessionHeaders(): Record<string, string> {
    if (this.sessionId) {
      return { 'X-Session-ID': this.sessionId };
    }
    return {};
  }

  // Health check
  async health(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseURL}/api/health`, {
      headers: this.getSessionHeaders(),
    });
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }

  // Send chat message (non-streaming)
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getSessionHeaders(),
      },
      body: JSON.stringify({ ...request, stream: false }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat request failed: ${error}`);
    }

    return response.json();
  }

  // Stream chat response
  streamChat(
    request: ChatRequest,
    onChunk: (chunk: StreamChunk) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): () => void {
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const startStream = async () => {
      try {
        console.log('🚀 Starting stream for request:', request.message.substring(0, 50));
        const response = await fetch(`${this.baseURL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            ...this.getSessionHeaders(),
          },
          body: JSON.stringify({ ...request, stream: true }),
          signal: abortController.signal,
        });

        console.log('📡 Response received:', response.status, response.headers.get('content-type'));

        if (!response.ok) {
          throw new Error(`Stream failed: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        console.log('✅ Stream reader ready, starting to read...');

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('🏁 Stream done');
            onComplete();
            break;
          }

          // Append new data to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          console.log('📦 Received chunk, buffer size:', buffer.length, 'chunk:', chunk.substring(0, 100));

          // SSE events are separated by double newlines
          // Look for complete events
          let boundary = buffer.indexOf('\n\n');

          while (boundary !== -1) {
            // Extract complete event
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            console.log('🔍 Processing event:', event.substring(0, 150));

            // Parse the event
            const lines = event.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();

                if (data === '[DONE]') {
                  console.log('✅ Received [DONE] marker');
                  onChunk({ type: 'done' });
                  onComplete();
                  return;
                }

                // Skip empty data lines
                if (!data) continue;

                try {
                  const chunk = JSON.parse(data) as StreamChunk;
                  console.log('✨ Parsed chunk:', chunk);
                  onChunk(chunk);
                } catch (e) {
                  console.error('❌ Failed to parse chunk:', e, 'Data:', data);
                }
              } else if (line.trim() && !line.startsWith(':')) {
                // Fallback: Handle events without 'data: ' prefix (malformed SSE)
                console.warn('⚠️ Event missing data: prefix, attempting parse:', line.substring(0, 100));
                try {
                  const chunk = JSON.parse(line.trim()) as StreamChunk;
                  console.log('✨ Parsed chunk (no prefix):', chunk);
                  onChunk(chunk);
                } catch {
                  console.error('❌ Failed to parse malformed event:', line.substring(0, 100));
                }
              }
            }

            // Look for next complete event
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('Stream aborted');
          } else {
            onError(error);
          }
        }
      } finally {
        if (reader) {
          reader.releaseLock();
        }
      }
    };

    startStream();

    // Return abort function
    return () => {
      abortController.abort();
    };
  }

  // Upload document
  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/api/documents/upload`, {
      method: 'POST',
      headers: this.getSessionHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    return response.json();
  }

  // Get document statistics
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await fetch(`${this.baseURL}/api/documents/stats`, {
      headers: this.getSessionHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch document stats');
    return response.json();
  }

  // List documents in session
  async listDocuments(): Promise<{ documents: string[]; count: number; total_chunks: number }> {
    const response = await fetch(`${this.baseURL}/api/documents/list`, {
      headers: this.getSessionHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch document list');
    return response.json();
  }

  // Cleanup session (delete all documents)
  async cleanupSession(): Promise<{ success: boolean; vectors_deleted: number }> {
    const response = await fetch(`${this.baseURL}/api/documents/cleanup`, {
      method: 'POST',
      headers: this.getSessionHeaders(),
    });
    if (!response.ok) throw new Error('Failed to cleanup session');
    return response.json();
  }

  // Delete all documents in session
  async deleteAllDocuments(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseURL}/api/documents/all`, {
      method: 'DELETE',
      headers: this.getSessionHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete documents');
    return response.json();
  }

  // Get performance metrics
  async getPerformance(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseURL}/api/metrics/performance`, {
      headers: this.getSessionHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch performance');
    return response.json();
  }
}

// Export singleton instance
export const apiClient = new APIClient();
