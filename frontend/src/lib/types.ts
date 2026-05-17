// Types matching the backend models

/**
 * RAG processing modes for tiered retrieval.
 * - simple: Fast semantic search only (~800ms, lowest cost)
 * - hybrid: Dense + Sparse (BM25) retrieval with fusion (~1200ms)
 * - agentic: Claude as autonomous agent with tool use (~2600ms, highest accuracy)
 * - auto: Intelligent routing based on query analysis
 */
export type RAGMode = 'simple' | 'hybrid' | 'agentic' | 'auto';

/**
 * Query classification for intelligent routing.
 */
export type QueryType =
  | 'factual'       // Direct fact lookup → SimpleRAG
  | 'conceptual'    // Understanding concepts → HybridRAG
  | 'comparative'   // Compare/contrast → HybridRAG or Agentic
  | 'procedural'    // How-to questions → HybridRAG
  | 'exploratory'   // Open-ended → AgenticRAG
  | 'multi_part';   // Multiple questions → AgenticRAG

/**
 * Analysis result from query analyzer.
 * Used for intelligent mode routing in AUTO mode.
 */
export interface QueryAnalysis {
  complexity_score: number;  // 0-1, higher = more complex
  query_type: QueryType;
  suggested_mode: RAGMode;
  keywords: string[];
  is_ambiguous: boolean;
  needs_rewriting: boolean;
  reasoning?: string;
}

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
    mode?: RAGMode;
    chunksRetrieved?: number;
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
  // RAG Mode Configuration
  rag_mode?: RAGMode;
  deep_mode?: boolean;
  return_analysis?: boolean;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  confidence?: number;
  metrics?: RetrievalMetrics;
  session_id?: string;
  timestamp?: Date;
  // Enhanced RAG fields
  query_analysis?: QueryAnalysis;
  rag_mode_used?: RAGMode;
}

export interface RetrievalMetrics {
  query_time_ms: number;
  num_results: number;
  reranked: boolean;
  top_score?: number;
  average_score?: number;
}

/**
 * Extended metrics for tiered RAG system.
 * Includes mode information and escalation details.
 */
export interface EnhancedRetrievalMetrics extends RetrievalMetrics {
  mode_used: RAGMode;
  mode_confidence: number;
  query_rewritten: boolean;
  original_query?: string;
  escalated_from?: RAGMode;
  escalation_reason?: string;
  tool_calls_made: number;
  dense_score?: number;
  sparse_score?: number;
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

/**
 * Individual chunk in a streaming response.
 * Sent via Server-Sent Events (SSE).
 */
export interface StreamChunk {
  type: 'token' | 'citation' | 'mode' | 'analysis' | 'tool_call' | 'done' | 'error';
  content?: string;
  citation?: Citation;
  metrics?: RetrievalMetrics;
  error?: string;
  metadata?: Record<string, unknown>;
  // Enhanced RAG fields
  mode?: RAGMode;
  analysis?: QueryAnalysis;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}