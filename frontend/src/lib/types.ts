// Types matching the backend models

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';  // 'data' added for AI SDK compatibility
  content: string;
  citations?: Citation[];
  confidence?: number;
  timestamp?: Date;  // Optional to support AI SDK UIMessage type
  metadata?: {
    processingTime?: number;
    tokensUsed?: number;
  };
}

export interface Citation {
  source: string;
  page?: number;
  chunk_id?: string;
  relevance_score: number;
  text_preview: string;
  metadata?: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  stream?: boolean;
  history?: ChatMessage[];
  openai_api_key?: string;
  openai_model?: string;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  confidence?: number;
  metrics?: RetrievalMetrics;
  session_id?: string;
  timestamp?: Date;
}

export interface RetrievalMetrics {
  query_time_ms: number;
  num_results: number;
  reranked: boolean;
  top_score?: number;
  average_score?: number;
}

export interface DocumentUploadResponse {
  document_id: string;  // This is the filename
  chunks_created: number;
  status?: 'success' | 'error';
  success?: boolean;
  message?: string;
  file_type?: string;
  vectors_indexed?: number;
}

export interface DocumentStats {
  total_documents: number;
  total_chunks: number;
  total_embeddings: number;
  index_size: string;
  last_updated: Date;
}

export interface MetricResult {
  mode: string;
  relevance_score: number;
  response_time: number;
  tokens_used: number;
  citations_count: number;
  confidence: number;
}

export interface StreamChunk {
  type: 'token' | 'citation' | 'done' | 'error';
  content?: string;
  citation?: Citation;
  metrics?: RetrievalMetrics;
  error?: string;
  metadata?: Record<string, unknown>;
}