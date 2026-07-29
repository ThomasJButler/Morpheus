"""
Utility modules for document processing and session management.

Chunking strategies:
- DocumentChunker: Basic recursive character splitting
- SemanticChunker: Structure-aware chunking (markdown headers)
- ParentChildChunker: Small retrieval chunks with large context parents
- ContextualChunker: Prepends document context to each chunk

Document processing:
- DocumentProcessor: Multi-format document extraction (PDF, TXT, MD, DOCX)

Session management:
- SessionManager: In-memory session storage with TTL
"""

from app.utils.chunking import (
    DocumentChunker,
    SemanticChunker,
    ParentChildChunker,
    ContextualChunker,
    chunk_text,
    chunk_text_semantic,
    chunk_text_parent_child,
)
from app.utils.document_processor import DocumentProcessor, process_document
from app.utils.session import SessionManager

__all__ = [
    # Chunking
    "DocumentChunker",
    "SemanticChunker",
    "ParentChildChunker",
    "ContextualChunker",
    "chunk_text",
    "chunk_text_semantic",
    "chunk_text_parent_child",
    # Document processing
    "DocumentProcessor",
    "process_document",
    # Session management
    "SessionManager",
]
