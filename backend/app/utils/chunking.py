"""
Text chunking utilities for document processing.
Uses LangChain's RecursiveCharacterTextSplitter for optimal chunking.
"""

import logging
from typing import List, Optional

from langchain_text_splitters import RecursiveCharacterTextSplitter

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


# Convenience function for quick chunking
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
