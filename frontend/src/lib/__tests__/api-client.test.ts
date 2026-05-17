import { apiClient } from '../api-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('APIClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('health', () => {
    it('returns health status on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      const result = await apiClient.health();

      expect(result).toEqual({ status: 'healthy' });
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/health'), expect.anything());
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(apiClient.health()).rejects.toThrow('Health check failed');
    });
  });

  describe('chat', () => {
    it('sends chat request with correct parameters', async () => {
      const mockResponse = {
        response: 'Test response',
        citations: [],
        metrics: { query_time_ms: 100 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request = {
        message: 'Test message',
        rag_mode: 'simple' as const,
        session_id: 'test-session',
      };

      const result = await apiClient.chat(request);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...request, stream: false }),
        })
      );
    });

    it('throws error on chat failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Server error'),
      });

      await expect(apiClient.chat({ message: 'test', rag_mode: 'simple' }))
        .rejects.toThrow('Chat request failed: Server error');
    });
  });

  describe('uploadDocument', () => {
    it('sends FormData correctly', async () => {
      const mockResponse = {
        document_id: 'doc-123',
        chunks_created: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const result = await apiClient.uploadDocument(file);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/documents/upload'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Verify FormData was sent
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBeInstanceOf(FormData);
    });

    it('throws error on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Upload failed'),
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await expect(apiClient.uploadDocument(file))
        .rejects.toThrow('Upload failed: Upload failed');
    });
  });

  describe('getDocumentStats', () => {
    it('returns document stats', async () => {
      const mockStats = {
        total_documents: 10,
        total_chunks: 150,
        total_vectors: 150,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await apiClient.getDocumentStats();

      expect(result).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/documents/stats'), expect.anything());
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(apiClient.getDocumentStats())
        .rejects.toThrow('Failed to fetch document stats');
    });
  });

  describe('getPerformance', () => {
    it('returns performance metrics', async () => {
      const mockPerformance = {
        avg_response_time: 200,
        requests_per_minute: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPerformance),
      });

      const result = await apiClient.getPerformance();

      expect(result).toEqual(mockPerformance);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/metrics/performance'), expect.anything());
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(apiClient.getPerformance())
        .rejects.toThrow('Failed to fetch performance');
    });
  });

  describe('streamChat', () => {
    it('calls onChunk with parsed chunks', async () => {
      const onChunk = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      // Create a mock ReadableStream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"token","content":"Hello"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"token","content":" World"}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      });

      const abort = apiClient.streamChat(
        { message: 'Hello', rag_mode: 'simple' },
        onChunk,
        onError,
        onComplete
      );

      // Wait for stream to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onChunk).toHaveBeenCalledWith({ type: 'token', content: 'Hello' });
      expect(onChunk).toHaveBeenCalledWith({ type: 'token', content: ' World' });
      expect(onChunk).toHaveBeenCalledWith({ type: 'done' });
      expect(onComplete).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();

      // Cleanup
      if (typeof abort === 'function') abort();
    });

    it('calls onError on stream failure', async () => {
      const onChunk = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      apiClient.streamChat(
        { message: 'Hello', rag_mode: 'simple' },
        onChunk,
        onError,
        onComplete
      );

      // Wait for error to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onError).toHaveBeenCalled();
    });

    it('returns abort function', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream(),
      });

      const abort = apiClient.streamChat(
        { message: 'Hello', rag_mode: 'simple' },
        jest.fn(),
        jest.fn(),
        jest.fn()
      );

      expect(typeof abort).toBe('function');
    });
  });
});
