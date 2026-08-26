// Plain fetch client for the local FastAPI backend. No sessions, no keys:
// the backend is on this machine and the library is yours.

import type {
  ChatRequest,
  DocumentInfo,
  DocumentStats,
  DocumentUploadResponse,
  HealthResponse,
  ModelsResponse,
  StreamEvent,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function ensureOk(response: Response, fallback: string): Promise<Response> {
  if (response.ok) return response;
  let detail = fallback;
  try {
    const body = await response.json();
    const d = (body as { detail?: unknown })?.detail;
    if (typeof d === 'string') detail = d;
    else if (d && typeof d === 'object' && 'message' in d) {
      detail = String((d as { message: unknown }).message);
    }
  } catch {
    // keep the fallback message
  }
  throw new Error(detail);
}

class APIClient {
  baseURL = API_URL;

  async health(): Promise<HealthResponse> {
    const res = await ensureOk(
      await fetch(`${this.baseURL}/api/health`),
      'Health check failed',
    );
    return res.json();
  }

  async listModels(): Promise<ModelsResponse> {
    const res = await ensureOk(
      await fetch(`${this.baseURL}/api/models`),
      'Failed to list models',
    );
    return res.json();
  }

  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await ensureOk(
      await fetch(`${this.baseURL}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      }),
      'Upload failed',
    );
    return res.json();
  }

  async listDocuments(): Promise<{ documents: DocumentInfo[] }> {
    const res = await ensureOk(
      await fetch(`${this.baseURL}/api/documents`),
      'Failed to fetch the document list',
    );
    return res.json();
  }

  async documentStats(): Promise<DocumentStats> {
    const res = await ensureOk(
      await fetch(`${this.baseURL}/api/documents/stats`),
      'Failed to fetch document stats',
    );
    return res.json();
  }

  async deleteDocument(source: string): Promise<void> {
    await ensureOk(
      await fetch(`${this.baseURL}/api/documents/${encodeURIComponent(source)}`, {
        method: 'DELETE',
      }),
      'Failed to delete the document',
    );
  }

  async clearDocuments(): Promise<void> {
    await ensureOk(
      await fetch(`${this.baseURL}/api/documents`, { method: 'DELETE' }),
      'Failed to clear the library',
    );
  }

  /**
   * POST /api/chat and parse the SSE stream. Events arrive as
   * `data: <json>` lines; `data: [DONE]` terminates. Returns an abort
   * function.
   */
  streamChat(
    request: ChatRequest,
    onEvent: (event: StreamEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
  ): () => void {
    const abortController = new AbortController();

    const run = async () => {
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      try {
        const response = await fetch(`${this.baseURL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(request),
          signal: abortController.signal,
        });
        if (!response.ok || !response.body) {
          await ensureOk(response, `Chat failed (${response.status})`);
          throw new Error('No response body');
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            onComplete();
            return;
          }
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const rawEvent = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            for (const line of rawEvent.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice('data: '.length).trim();
              if (!data) continue;
              if (data === '[DONE]') {
                onComplete();
                return;
              }
              try {
                onEvent(JSON.parse(data) as StreamEvent);
              } catch {
                // A malformed line is dropped; the [DONE] sentinel still
                // terminates the stream cleanly.
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          onError(error);
        }
      } finally {
        reader?.releaseLock();
      }
    };

    run();
    return () => abortController.abort();
  }
}

export const apiClient = new APIClient();
