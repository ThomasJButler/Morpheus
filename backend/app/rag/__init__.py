"""
RAG (Retrieval-Augmented Generation) implementations.

Tiered RAG system with three modes:
- SimpleRAG: Fast semantic search (~800ms, lowest cost)
- HybridRAG: Dense + Sparse retrieval with BM25 fusion + reranking (~1200ms)
- AgenticRAG: Claude as autonomous agent with tool use (~2600ms, highest accuracy)

Plus supporting utilities:
- QueryAnalyzer: Intelligent mode routing with HyDE support
- QueryRewriter: LLM-based query optimization
- RAGOrchestrator: Central controller with auto-escalation
- Reranker: Cross-encoder reranking for improved precision
- EnhancedRetriever: Multi-query expansion + RRF + compression
"""

from app.rag.simple import SimpleRAG
from app.rag.hybrid import HybridRAG
from app.rag.agentic import AgenticRAG
from app.rag.query_analyzer import QueryAnalyzer
from app.rag.query_rewriter import (
    QueryRewriter,
    rewrite_query,
    expand_query,
    decompose_query,
)
from app.rag.orchestrator import RAGOrchestrator, get_orchestrator
from app.rag.reranker import Reranker, rerank_contexts
from app.rag.enhanced_retriever import (
    EnhancedRetriever,
    retrieve_enhanced,
    retrieve_with_multi_query,
)

__all__ = [
    # RAG implementations
    "SimpleRAG",
    "HybridRAG",
    "AgenticRAG",
    # Orchestration
    "RAGOrchestrator",
    "get_orchestrator",
    # Query utilities
    "QueryAnalyzer",
    "QueryRewriter",
    "rewrite_query",
    "expand_query",
    "decompose_query",
    # Reranking
    "Reranker",
    "rerank_contexts",
    # Enhanced retrieval
    "EnhancedRetriever",
    "retrieve_enhanced",
    "retrieve_with_multi_query",
]
