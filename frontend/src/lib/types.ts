// Types matching backend/app/models/chat.py. Everything is local: two
// retrieval modes, citations verified against retrieved chunks, and a
// grounded flag the UI shows instead of pretending.

export type RetrievalMode = 'hybrid' | 'vector';

export interface Citation {
  /** The [n] marker used in the answer text. */
  index: number;
  /** The retrieved chunk this marker maps to (validated server-side). */
  chunk_id: string;
  source: string;
  page?: number | null;
  text_preview: string;
  /** Relative relevance, 1.0 = top hit. */
  score: number;
}

export interface DoneInfo {
  retrieved: number;
  cited: number;
  grounded: boolean;
  model: string;
  mode: RetrievalMode;
  deep?: boolean;
  retrieval_ms?: number;
  generation_ms?: number;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
}

export interface StreamEvent {
  type: 'mode' | 'token' | 'citation' | 'done' | 'error';
  content?: string;
  citation?: Citation;
  done?: DoneInfo;
  mode?: RetrievalMode;
  deep?: boolean;
  model?: string;
  code?: string;
  message?: string;
}

export interface ChatRequest {
  message: string;
  mode: RetrievalMode;
  deep: boolean;
  model?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  done?: DoneInfo;
  timestamp?: Date;
}

export interface DocumentInfo {
  source: string;
  chunks: number;
  pages?: number | null;
  added_at: string;
}

export interface DocumentUploadResponse {
  source: string;
  chunks: number;
  pages?: number | null;
  replaced: boolean;
}

export interface DocumentStats {
  documents: number;
  chunks: number;
  size_bytes: number;
}

export interface ModelEntry {
  name: string;
  size?: number;
  parameter_size?: string | null;
  configured: boolean;
}

export interface ModelsResponse {
  chat: ModelEntry[];
  embed: ModelEntry[];
  ollama_version: string;
}

export interface HealthResponse {
  status: 'ready' | 'degraded';
  ollama: { base_url: string; reachable: boolean; version: string | null };
  models: {
    chat: { name: string; installed: boolean };
    embed: { name: string; installed: boolean };
  };
  store: {
    path: string;
    documents: number | null;
    chunks: number | null;
    size_bytes: number | null;
    error?: string;
  };
  hints: string[];
}
