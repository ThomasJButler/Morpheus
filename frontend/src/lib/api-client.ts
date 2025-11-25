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

  constructor() {
    this.baseURL = API_URL;
  }

  // Health check
  async health(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseURL}/api/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }

  // Send chat message (non-streaming)
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`${this.baseURL}/api/documents/stats`);
    if (!response.ok) throw new Error('Failed to fetch document stats');
    return response.json();
  }

  // Get performance metrics
  async getPerformance(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseURL}/api/metrics/performance`);
    if (!response.ok) throw new Error('Failed to fetch performance');
    return response.json();
  }
}

// Export singleton instance
export const apiClient = new APIClient();