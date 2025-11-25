"""
Tests for document chunking utilities.
"""

import pytest
from app.utils.chunking import DocumentChunker, chunk_text


class TestDocumentChunker:
    """Tests for the DocumentChunker class."""

    def test_chunker_initialization_default_values(self):
        """Test chunker initializes with default config values."""
        chunker = DocumentChunker()
        assert chunker.chunk_size > 0
        assert chunker.chunk_overlap >= 0
        assert chunker.chunk_overlap < chunker.chunk_size

    def test_chunker_initialization_custom_values(self):
        """Test chunker initializes with custom values."""
        chunker = DocumentChunker(chunk_size=500, chunk_overlap=50)
        assert chunker.chunk_size == 500
        assert chunker.chunk_overlap == 50

    def test_chunk_text_returns_list(self):
        """Test chunk_text returns a list of chunks."""
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        text = "This is a test document. " * 50
        chunks = chunker.chunk_text(text)

        assert isinstance(chunks, list)
        assert len(chunks) > 0

    def test_chunk_text_empty_string_returns_empty_list(self):
        """Test empty text returns empty list."""
        chunker = DocumentChunker()
        chunks = chunker.chunk_text("")

        assert chunks == []

    def test_chunk_text_whitespace_only_returns_empty_list(self):
        """Test whitespace-only text returns empty list."""
        chunker = DocumentChunker()
        chunks = chunker.chunk_text("   \n\t  ")

        assert chunks == []

    def test_chunk_text_respects_size_limit(self):
        """Test chunks don't exceed chunk size."""
        chunk_size = 200
        chunker = DocumentChunker(chunk_size=chunk_size, chunk_overlap=20)
        text = "This is a test sentence. " * 100
        chunks = chunker.chunk_text(text)

        for chunk in chunks:
            # Allow some flexibility for word boundaries
            assert len(chunk["text"]) <= chunk_size + 50

    def test_chunk_text_includes_chunk_index(self):
        """Test chunks include correct index."""
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        text = "This is a test document. " * 50
        chunks = chunker.chunk_text(text)

        for i, chunk in enumerate(chunks):
            assert chunk["chunk_index"] == i

    def test_chunk_text_includes_total_chunks(self):
        """Test chunks include total count."""
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        text = "This is a test document. " * 50
        chunks = chunker.chunk_text(text)

        total = len(chunks)
        for chunk in chunks:
            assert chunk["total_chunks"] == total

    def test_chunk_text_preserves_metadata(self):
        """Test metadata is preserved in chunks."""
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        text = "This is a test document. " * 50
        metadata = {"source": "test.pdf", "page": 1, "author": "Test Author"}

        chunks = chunker.chunk_text(text, metadata)

        for chunk in chunks:
            assert chunk["source"] == "test.pdf"
            assert chunk["page"] == 1
            assert chunk["author"] == "Test Author"

    def test_chunk_overlap_preserved(self):
        """Test that chunks have overlapping content."""
        chunk_size = 100
        overlap = 30
        chunker = DocumentChunker(chunk_size=chunk_size, chunk_overlap=overlap)
        text = "Word " * 200  # Long enough to create multiple chunks
        chunks = chunker.chunk_text(text)

        if len(chunks) > 1:
            # Check that consecutive chunks have some overlap
            for i in range(len(chunks) - 1):
                # The end of chunk i should share content with start of chunk i+1
                chunk1_end = chunks[i]["text"][-overlap:]
                chunk2_start = chunks[i + 1]["text"][:overlap]
                # They should share some common words
                words1 = set(chunk1_end.split())
                words2 = set(chunk2_start.split())
                assert len(words1 & words2) > 0

    def test_chunk_documents_multiple_docs(self):
        """Test chunking multiple documents."""
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        documents = [
            {"text": "First document content. " * 20, "source": "doc1.txt"},
            {"text": "Second document content. " * 20, "source": "doc2.txt"},
        ]

        chunks = chunker.chunk_documents(documents)

        assert len(chunks) > 2  # Should create multiple chunks
        # Check document_index is set
        doc0_chunks = [c for c in chunks if c.get("document_index") == 0]
        doc1_chunks = [c for c in chunks if c.get("document_index") == 1]
        assert len(doc0_chunks) > 0
        assert len(doc1_chunks) > 0

    def test_get_chunk_preview_short_text(self):
        """Test preview returns full text if under limit."""
        chunker = DocumentChunker()
        chunk = {"text": "Short text"}
        preview = chunker.get_chunk_preview(chunk, max_length=100)

        assert preview == "Short text"

    def test_get_chunk_preview_truncates_long_text(self):
        """Test preview truncates long text."""
        chunker = DocumentChunker()
        long_text = "A" * 200
        chunk = {"text": long_text}
        preview = chunker.get_chunk_preview(chunk, max_length=50)

        assert len(preview) == 53  # 50 chars + "..."
        assert preview.endswith("...")


class TestChunkTextFunction:
    """Tests for the convenience chunk_text function."""

    def test_chunk_text_function_works(self):
        """Test the convenience function works."""
        text = "This is a test. " * 100
        chunks = chunk_text(text, chunk_size=200, chunk_overlap=20)

        assert isinstance(chunks, list)
        assert len(chunks) > 0

    def test_chunk_text_function_with_metadata(self):
        """Test convenience function preserves metadata."""
        text = "This is a test. " * 100
        metadata = {"source": "test.txt"}
        chunks = chunk_text(text, metadata=metadata)

        for chunk in chunks:
            assert chunk["source"] == "test.txt"
