import { apiClient } from '../api-client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('APIClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('health', () => {
    it('returns the health payload', async () => {
      const payload = { status: 'ready', hints: [] };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(payload) });
      await expect(apiClient.health()).resolves.toEqual(payload);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/health'));
    });

    it('surfaces the backend detail message on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: { code: 'x', message: 'Ollama is down' } }),
      });
      await expect(apiClient.health()).rejects.toThrow('Ollama is down');
    });
  });

  describe('documents', () => {
    it('lists documents', async () => {
      const docs = { documents: [{ source: 'a.md', chunks: 3, pages: null, added_at: 't' }] };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(docs) });
      await expect(apiClient.listDocuments()).resolves.toEqual(docs);
    });

    it('uploads via FormData', async () => {
      const response = { source: 'test.pdf', chunks: 5, pages: 2, replaced: false };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(response) });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      await expect(apiClient.uploadDocument(file)).resolves.toEqual(response);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/documents/upload');
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);
    });

    it('throws the string detail on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Unsupported file type .exe.' }),
      });
      const file = new File(['x'], 'x.exe');
      await expect(apiClient.uploadDocument(file)).rejects.toThrow('Unsupported file type .exe.');
    });

    it('URL-encodes the source when deleting', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      await apiClient.deleteDocument('weird name & things.md');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/documents/weird%20name%20%26%20things.md');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('streamChat', () => {
    it('parses token, citation and done events and stops at [DONE]', async () => {
      const onEvent = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"mode","mode":"hybrid"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"token","content":"Hello "}\n\n'));
          controller.enqueue(
            encoder.encode(
              'data: {"type":"citation","citation":{"index":1,"chunk_id":"abc","source":"a.md","text_preview":"t","score":1.0}}\n\n',
            ),
          );
          controller.enqueue(
            encoder.encode(
              'data: {"type":"done","done":{"retrieved":3,"cited":1,"grounded":true,"model":"m","mode":"hybrid"}}\n\n',
            ),
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

      apiClient.streamChat(
        { message: 'Hello', mode: 'hybrid', deep: false },
        onEvent,
        onError,
        onComplete,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onEvent).toHaveBeenCalledWith({ type: 'mode', mode: 'hybrid' });
      expect(onEvent).toHaveBeenCalledWith({ type: 'token', content: 'Hello ' });
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'citation' }),
      );
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'done',
          done: expect.objectContaining({ grounded: true, cited: 1 }),
        }),
      );
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('reports a non-OK response through onError with the backend detail', async () => {
      const onError = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: { code: 'ollama_unavailable', message: 'Ollama is not reachable' } }),
      });
      apiClient.streamChat(
        { message: 'x', mode: 'hybrid', deep: false },
        jest.fn(),
        onError,
        jest.fn(),
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('Ollama is not reachable');
    });

    it('returns an abort function', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, body: new ReadableStream() });
      const abort = apiClient.streamChat(
        { message: 'x', mode: 'hybrid', deep: false },
        jest.fn(),
        jest.fn(),
        jest.fn(),
      );
      expect(typeof abort).toBe('function');
      abort();
    });
  });
});
