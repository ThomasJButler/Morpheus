"""
RAG (Retrieval-Augmented Generation) implementations.

Tiered RAG system with three modes:
- SimpleRAG: Fast semantic search (~800ms, lowest cost)
- HybridRAG: Dense + Sparse retrieval with BM25 fusion (~1200ms)
- AgenticRAG: Claude as autonomous agent with tool use (~2600ms, highest accuracy)

Plus supporting utilities:
- QueryRewriter: LLM-based query optimization
- Reranker: Cross-encoder reranking (optional)
"""

from app.rag.simple import SimpleRAG
from app.rag.hybrid import HybridRAG
from app.rag.agentic import AgenticRAG
from app.rag.query_rewriter import (
    QueryRewriter,
    rewrite_query,
    expand_query,
    decompose_query,
)

__all__ = [
    # RAG implementations
    "SimpleRAG",
    "HybridRAG",
    "AgenticRAG",
    # Query utilities
    "QueryRewriter",
    "rewrite_query",
    "expand_query",
    "decompose_query",
]
