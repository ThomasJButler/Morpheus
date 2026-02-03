"""
Text chunking utilities for document processing.

Provides multiple chunking strategies:
- Basic recursive splitting (default)
- Semantic chunking (respects document structure)
- Parent-child chunking (small retrieval, large context)

Uses LangChain's text splitters as foundation.
"""

import logging
import re
from typing import List, Optional, Tuple

from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
)

from app.core.config import settings

logger = logging.getLogger(__name__)


class DocumentChunker:
    """
    Handles text chunking for RAG document processing.

    Uses recursive character splitting with configurable chunk size and overlap
    to maintain context while keeping chunks within size limits.
    """

    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        """
        Initialize document chunker.

        Args:
            chunk_size: Maximum size of each chunk (defaults to config)
            chunk_overlap: Overlap between chunks (defaults to config)
        """
        self.chunk_size = chunk_size or settings.max_chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
            keep_separator=True,
        )

        logger.info(
            f"DocumentChunker initialized: chunk_size={self.chunk_size}, "
            f"overlap={self.chunk_overlap}"
        )

    def chunk_text(self, text: str, metadata: Optional[dict] = None) -> List[dict]:
        """
        Split text into chunks with metadata.

        Args:
            text: Text to chunk
            metadata: Optional metadata to attach to each chunk

        Returns:
            List of chunk dictionaries with text and metadata
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for chunking")
            return []

        try:
            # Split text into chunks
            chunks = self.text_splitter.split_text(text)

            # Format chunks with metadata
            chunked_docs = []
            for i, chunk in enumerate(chunks):
                chunk_data = {
                    "text": chunk,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }

                # Add provided metadata
                if metadata:
                    chunk_data.update(metadata)

                chunked_docs.append(chunk_data)

            logger.info(f"Chunked text into {len(chunks)} chunks")
            return chunked_docs

        except Exception as e:
            logger.error(f"Error chunking text: {e}", exc_info=True)
            raise

    def chunk_documents(
        self, documents: List[dict]
    ) -> List[dict]:
        """
        Chunk multiple documents with their metadata.

        Args:
            documents: List of documents with 'text' and optional metadata

        Returns:
            List of all chunks from all documents
        """
        all_chunks = []

        for doc_idx, doc in enumerate(documents):
            text = doc.get("text", "")
            metadata = {k: v for k, v in doc.items() if k != "text"}
            metadata["document_index"] = doc_idx

            chunks = self.chunk_text(text, metadata)
            all_chunks.extend(chunks)

        logger.info(
            f"Chunked {len(documents)} documents into {len(all_chunks)} total chunks"
        )
        return all_chunks

    def get_chunk_preview(self, chunk: dict, max_length: int = 100) -> str:
        """
        Get a preview of a chunk for logging/display.

        Args:
            chunk: Chunk dictionary
            max_length: Maximum preview length

        Returns:
            Preview string
        """
        text = chunk.get("text", "")
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."


class SemanticChunker:
    """
    Structure-aware chunking that respects document organization.

    Features:
    - Splits on markdown headers (preserves section context)
    - Prepends section headers to chunks for better retrieval
    - Handles nested sections properly
    - Falls back to recursive splitting for non-markdown content
    """

    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        """
        Initialize semantic chunker.

        Args:
            chunk_size: Maximum size of each chunk
            chunk_overlap: Overlap between chunks
        """
        self.chunk_size = chunk_size or settings.max_chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap

        # Markdown header splitter - splits on headers while preserving hierarchy
        self.header_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "h1"),
                ("##", "h2"),
                ("###", "h3"),
                ("####", "h4"),
            ],
            strip_headers=False,
        )

        # Fallback recursive splitter for large sections
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
            keep_separator=True,
        )

        logger.info("SemanticChunker initialized with markdown header awareness")

    def chunk_text(self, text: str, metadata: Optional[dict] = None) -> List[dict]:
        """
        Split text semantically, respecting document structure.

        Args:
            text: Text to chunk (markdown or plain text)
            metadata: Optional metadata to attach

        Returns:
            List of chunk dictionaries with text and metadata
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for chunking")
            return []

        try:
            # Check if content appears to be markdown
            is_markdown = self._is_markdown(text)

            if is_markdown:
                return self._chunk_markdown(text, metadata)
            else:
                return self._chunk_plain_text(text, metadata)

        except Exception as e:
            logger.error(f"Error in semantic chunking: {e}", exc_info=True)
            # Fallback to basic chunking
            chunker = DocumentChunker(self.chunk_size, self.chunk_overlap)
            return chunker.chunk_text(text, metadata)

    def _is_markdown(self, text: str) -> bool:
        """Detect if text appears to be markdown."""
        # Check for markdown indicators
        markdown_patterns = [
            r'^#{1,6}\s+',      # Headers
            r'^\*\*.*\*\*',     # Bold
            r'^\*.*\*',         # Italic
            r'^\-\s+',          # Unordered list
            r'^\d+\.\s+',       # Ordered list
            r'^```',            # Code blocks
            r'^\|.*\|',         # Tables
        ]

        lines = text.split('\n')[:20]  # Check first 20 lines
        markdown_count = 0

        for line in lines:
            for pattern in markdown_patterns:
                if re.match(pattern, line.strip()):
                    markdown_count += 1
                    break

        # Consider markdown if at least 3 indicators found
        return markdown_count >= 3

    def _chunk_markdown(self, text: str, metadata: Optional[dict] = None) -> List[dict]:
        """
        Chunk markdown content respecting section structure.

        Each chunk includes its section header context for better retrieval.
        """
        # Split by headers first
        header_splits = self.header_splitter.split_text(text)

        all_chunks = []
        chunk_index = 0

        for doc in header_splits:
            content = doc.page_content
            header_metadata = doc.metadata

            # Build section path (e.g., "Chapter 1 > Section 2 > Subsection")
            section_path = self._build_section_path(header_metadata)

            # If section is too large, split further
            if len(content) > self.chunk_size:
                sub_chunks = self.text_splitter.split_text(content)
            else:
                sub_chunks = [content]

            for sub_chunk in sub_chunks:
                # Prepend section context to chunk for better retrieval
                contextual_chunk = self._add_section_context(sub_chunk, section_path)

                chunk_data = {
                    "text": contextual_chunk,
                    "chunk_index": chunk_index,
                    "section_path": section_path,
                    "section_headers": header_metadata,
                    "chunking_method": "semantic",
                }

                if metadata:
                    chunk_data.update(metadata)

                all_chunks.append(chunk_data)
                chunk_index += 1

        # Update total chunks
        for chunk in all_chunks:
            chunk["total_chunks"] = len(all_chunks)

        logger.info(f"Semantic chunking produced {len(all_chunks)} chunks")
        return all_chunks

    def _chunk_plain_text(self, text: str, metadata: Optional[dict] = None) -> List[dict]:
        """Chunk plain text with paragraph awareness."""
        # Try to identify logical sections by blank lines
        paragraphs = text.split('\n\n')

        # Group small paragraphs together
        current_group = []
        current_length = 0
        groups = []

        for para in paragraphs:
            para_length = len(para)

            if current_length + para_length > self.chunk_size and current_group:
                groups.append('\n\n'.join(current_group))
                current_group = [para]
                current_length = para_length
            else:
                current_group.append(para)
                current_length += para_length + 2  # +2 for \n\n

        if current_group:
            groups.append('\n\n'.join(current_group))

        # Further split groups that are still too large
        all_chunks = []
        chunk_index = 0

        for group in groups:
            if len(group) > self.chunk_size:
                sub_chunks = self.text_splitter.split_text(group)
            else:
                sub_chunks = [group]

            for sub_chunk in sub_chunks:
                chunk_data = {
                    "text": sub_chunk,
                    "chunk_index": chunk_index,
                    "chunking_method": "paragraph",
                }

                if metadata:
                    chunk_data.update(metadata)

                all_chunks.append(chunk_data)
                chunk_index += 1

        for chunk in all_chunks:
            chunk["total_chunks"] = len(all_chunks)

        logger.info(f"Paragraph-aware chunking produced {len(all_chunks)} chunks")
        return all_chunks

    def _build_section_path(self, header_metadata: dict) -> str:
        """Build a hierarchical section path from header metadata."""
        parts = []
        for level in ['h1', 'h2', 'h3', 'h4']:
            if level in header_metadata:
                parts.append(header_metadata[level])
        return ' > '.join(parts) if parts else ""

    def _add_section_context(self, chunk: str, section_path: str) -> str:
        """
        Prepend section context to chunk.

        This improves retrieval by including header context in the embedding.
        """
        if section_path:
            return f"[Section: {section_path}]\n\n{chunk}"
        return chunk


class ParentChildChunker:
    """
    Parent-child chunking strategy for optimal retrieval and context.

    Creates two types of chunks:
    - Child chunks: Small, for precise retrieval
    - Parent chunks: Larger, for complete context

    When retrieving, we match on child chunks but return the parent context.
    This gives the best of both worlds: precise matching and rich context.
    """

    def __init__(
        self,
        child_chunk_size: int = 400,
        parent_chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        """
        Initialize parent-child chunker.

        Args:
            child_chunk_size: Size of small retrieval chunks
            parent_chunk_size: Size of larger context chunks (default: 3x child)
            chunk_overlap: Overlap between chunks
        """
        self.child_chunk_size = child_chunk_size
        self.parent_chunk_size = parent_chunk_size or (child_chunk_size * 3)
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap

        self.parent_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.parent_chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        self.child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.child_chunk_size,
            chunk_overlap=0,  # No overlap for children within same parent
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        logger.info(
            f"ParentChildChunker initialized: child={child_chunk_size}, "
            f"parent={self.parent_chunk_size}"
        )

    def chunk_text(
        self, text: str, metadata: Optional[dict] = None
    ) -> Tuple[List[dict], List[dict]]:
        """
        Create parent and child chunks.

        Args:
            text: Text to chunk
            metadata: Optional metadata to attach

        Returns:
            Tuple of (child_chunks, parent_chunks)
            - child_chunks: For storage/retrieval, each references parent_id
            - parent_chunks: For context, each has unique parent_id
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for chunking")
            return [], []

        try:
            # First, create parent chunks
            parent_texts = self.parent_splitter.split_text(text)
            parent_chunks = []
            child_chunks = []
            child_index = 0

            for parent_idx, parent_text in enumerate(parent_texts):
                parent_id = f"parent_{parent_idx}"

                # Create parent chunk
                parent_data = {
                    "text": parent_text,
                    "parent_id": parent_id,
                    "chunk_index": parent_idx,
                    "chunk_type": "parent",
                }
                if metadata:
                    parent_data.update(metadata)
                parent_chunks.append(parent_data)

                # Create child chunks from this parent
                child_texts = self.child_splitter.split_text(parent_text)

                for child_text in child_texts:
                    child_data = {
                        "text": child_text,
                        "parent_id": parent_id,
                        "parent_text": parent_text,  # Include parent for retrieval context
                        "chunk_index": child_index,
                        "chunk_type": "child",
                    }
                    if metadata:
                        child_data.update(metadata)
                    child_chunks.append(child_data)
                    child_index += 1

            # Update totals
            for chunk in parent_chunks:
                chunk["total_parents"] = len(parent_chunks)
            for chunk in child_chunks:
                chunk["total_chunks"] = len(child_chunks)

            logger.info(
                f"ParentChild chunking: {len(child_chunks)} children, "
                f"{len(parent_chunks)} parents"
            )
            return child_chunks, parent_chunks

        except Exception as e:
            logger.error(f"Error in parent-child chunking: {e}", exc_info=True)
            raise


class ContextualChunker:
    """
    Contextual chunking that adds document-level context to each chunk.

    Prepends a brief document summary or key terms to each chunk,
    improving retrieval for queries about the document overall.
    """

    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        self.chunk_size = chunk_size or settings.max_chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def chunk_with_context(
        self,
        text: str,
        document_context: str,
        metadata: Optional[dict] = None,
    ) -> List[dict]:
        """
        Chunk text and prepend document context to each chunk.

        Args:
            text: Text to chunk
            document_context: Context to prepend (e.g., document title, summary)
            metadata: Optional metadata

        Returns:
            List of chunks with prepended context
        """
        if not text or not text.strip():
            return []

        chunks = self.text_splitter.split_text(text)
        chunked_docs = []

        for i, chunk in enumerate(chunks):
            # Prepend context
            contextual_text = f"{document_context}\n\n---\n\n{chunk}"

            chunk_data = {
                "text": contextual_text,
                "original_text": chunk,
                "context": document_context,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "chunking_method": "contextual",
            }

            if metadata:
                chunk_data.update(metadata)

            chunked_docs.append(chunk_data)

        logger.info(f"Contextual chunking produced {len(chunked_docs)} chunks")
        return chunked_docs


# Convenience functions

def chunk_text(
    text: str,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> List[dict]:
    """
    Quick text chunking function.

    Args:
        text: Text to chunk
        chunk_size: Optional chunk size override
        chunk_overlap: Optional overlap override
        metadata: Optional metadata to attach

    Returns:
        List of chunks
    """
    chunker = DocumentChunker(chunk_size, chunk_overlap)
    return chunker.chunk_text(text, metadata)


def chunk_text_semantic(
    text: str,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> List[dict]:
    """
    Semantic text chunking function.

    Uses structure-aware chunking that respects markdown headers
    and document organization.

    Args:
        text: Text to chunk
        chunk_size: Optional chunk size override
        chunk_overlap: Optional overlap override
        metadata: Optional metadata to attach

    Returns:
        List of semantically-chunked documents
    """
    chunker = SemanticChunker(chunk_size, chunk_overlap)
    return chunker.chunk_text(text, metadata)


def chunk_text_parent_child(
    text: str,
    child_chunk_size: int = 400,
    parent_chunk_size: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> Tuple[List[dict], List[dict]]:
    """
    Parent-child chunking function.

    Creates small chunks for retrieval that reference larger parent chunks
    for context.

    Args:
        text: Text to chunk
        child_chunk_size: Size of retrieval chunks
        parent_chunk_size: Size of context chunks
        metadata: Optional metadata

    Returns:
        Tuple of (child_chunks, parent_chunks)
    """
    chunker = ParentChildChunker(child_chunk_size, parent_chunk_size)
    return chunker.chunk_text(text, metadata)
