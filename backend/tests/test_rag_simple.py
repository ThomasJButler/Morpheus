"""
Tests for SimpleRAG pipeline.
Tests the core RAG functionality with mocked external services.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.rag.simple import SimpleRAG
from app.models.chat import Citation, RetrievalMetrics


class TestSimpleRAGFormatting:
    """Tests for SimpleRAG formatting methods (no external calls)."""

    def test_format_context_empty_list(self):
        """Test formatting empty context returns message."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()
                rag = SimpleRAG()

        result = rag.format_context_for_prompt([])
        assert result == "No relevant context found."

    def test_format_context_single_item(self):
        """Test formatting single context item."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()
                rag = SimpleRAG()

        contexts = [
            {
                "text": "This is test content.",
                "source": "test.pdf",
                "page": 5,
                "score": 0.9,
            }
        ]

        result = rag.format_context_for_prompt(contexts)

        assert "[Context 1]" in result
        assert "Source: test.pdf" in result
        assert "Page 5" in result
        assert "This is test content." in result

    def test_format_context_multiple_items(self):
        """Test formatting multiple context items."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()
                rag = SimpleRAG()

        contexts = [
            {"text": "First content.", "source": "doc1.pdf", "page": 1, "score": 0.9},
            {"text": "Second content.", "source": "doc2.pdf", "score": 0.8},
        ]

        result = rag.format_context_for_prompt(contexts)

        assert "[Context 1]" in result
        assert "[Context 2]" in result
        assert "doc1.pdf" in result
        assert "doc2.pdf" in result

    def test_format_context_no_page(self):
        """Test formatting context without page number."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()
                rag = SimpleRAG()

        contexts = [{"text": "Content.", "source": "test.txt", "score": 0.9}]

        result = rag.format_context_for_prompt(contexts)

        assert "Page" not in result

    def test_create_citations(self):
        """Test citation creation from contexts."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()
                rag = SimpleRAG()

        contexts = [
            {
                "text": "This is test content that is longer than 200 characters. " * 5,
                "source": "test.pdf",
                "page": 3,
                "chunk_id": "chunk_123",
                "score": 0.85,
            }
        ]

        citations = rag.create_citations(contexts)

        assert len(citations) == 1
        assert citations[0].source == "test.pdf"
        assert citations[0].page == 3
        assert citations[0].chunk_id == "chunk_123"
        assert citations[0].relevance_score == 0.85
        assert len(citations[0].text_preview) <= 200

    def test_create_citations_multiple(self):
        """Test creating multiple citations."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()
                rag = SimpleRAG()

        contexts = [
            {"text": "First.", "source": "a.pdf", "score": 0.9},
            {"text": "Second.", "source": "b.pdf", "score": 0.8},
            {"text": "Third.", "source": "c.pdf", "score": 0.7},
        ]

        citations = rag.create_citations(contexts)

        assert len(citations) == 3
        assert citations[0].source == "a.pdf"
        assert citations[1].source == "b.pdf"
        assert citations[2].source == "c.pdf"


class TestSimpleRAGEmbedding:
    """Tests for embedding generation."""

    @pytest.mark.asyncio
    async def test_embed_query_returns_vector(self):
        """Test embed_query returns a vector."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.embedding_model = "text-embedding-3-small"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()

                with patch("app.rag.simple.AsyncOpenAI") as mock_openai:
                    mock_client = AsyncMock()
                    mock_response = MagicMock()
                    mock_response.data = [MagicMock(embedding=[0.1] * 512)]
                    mock_client.embeddings.create = AsyncMock(
                        return_value=mock_response
                    )
                    mock_openai.return_value = mock_client

                    rag = SimpleRAG()
                    vector = await rag.embed_query("test query")

        assert isinstance(vector, list)
        assert len(vector) == 512
        assert all(isinstance(v, float) for v in vector)

    @pytest.mark.asyncio
    async def test_embed_query_uses_correct_model(self):
        """Test embed_query uses configured model."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.embedding_model = "text-embedding-3-small"

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = MagicMock()

                with patch("app.rag.simple.AsyncOpenAI") as mock_openai:
                    mock_client = AsyncMock()
                    mock_response = MagicMock()
                    mock_response.data = [MagicMock(embedding=[0.1] * 512)]
                    mock_client.embeddings.create = AsyncMock(
                        return_value=mock_response
                    )
                    mock_openai.return_value = mock_client

                    rag = SimpleRAG()
                    await rag.embed_query("test query")

                    # Verify the correct model was used
                    call_args = mock_client.embeddings.create.call_args
                    assert call_args.kwargs["model"] == "text-embedding-3-small"


class TestSimpleRAGRetrieval:
    """Tests for context retrieval."""

    @pytest.mark.asyncio
    async def test_retrieve_context_filters_by_relevance(self):
        """Test retrieval filters low-relevance results."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.top_k_results = 10
            mock_settings.min_relevance_score = 0.5

            mock_index = MagicMock()
            mock_index.query.return_value = {
                "matches": [
                    MagicMock(
                        id="1", score=0.9, metadata={"text": "High", "source": "a.txt"}
                    ),
                    MagicMock(
                        id="2",
                        score=0.6,
                        metadata={"text": "Medium", "source": "b.txt"},
                    ),
                    MagicMock(
                        id="3", score=0.3, metadata={"text": "Low", "source": "c.txt"}
                    ),
                ]
            }

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = mock_index

                with patch("app.rag.simple.AsyncOpenAI"):
                    with patch("app.rag.simple.AsyncAnthropic"):
                        rag = SimpleRAG()
                        contexts, metrics = await rag.retrieve_context([0.1] * 512)

        # Should filter out the low score (0.3 < 0.5)
        assert len(contexts) == 2
        assert metrics.num_results == 2

    @pytest.mark.asyncio
    async def test_retrieve_context_returns_metrics(self):
        """Test retrieval returns proper metrics."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.top_k_results = 5
            mock_settings.min_relevance_score = 0.3

            mock_index = MagicMock()
            mock_index.query.return_value = {
                "matches": [
                    MagicMock(
                        id="1", score=0.9, metadata={"text": "A", "source": "a.txt"}
                    ),
                    MagicMock(
                        id="2", score=0.7, metadata={"text": "B", "source": "b.txt"}
                    ),
                ]
            }

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = mock_index

                with patch("app.rag.simple.AsyncOpenAI"):
                    with patch("app.rag.simple.AsyncAnthropic"):
                        rag = SimpleRAG()
                        contexts, metrics = await rag.retrieve_context([0.1] * 512)

        assert isinstance(metrics, RetrievalMetrics)
        assert metrics.num_results == 2
        assert metrics.top_score == 0.9
        assert metrics.average_score == 0.8
        assert metrics.query_time_ms > 0

    @pytest.mark.asyncio
    async def test_retrieve_context_empty_results(self):
        """Test handling of no results."""
        with patch("app.rag.simple.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.top_k_results = 5
            mock_settings.min_relevance_score = 0.5

            mock_index = MagicMock()
            mock_index.query.return_value = {"matches": []}

            with patch("app.rag.simple.get_pinecone_client") as mock_pc:
                mock_pc.return_value.get_index.return_value = mock_index

                with patch("app.rag.simple.AsyncOpenAI"):
                    with patch("app.rag.simple.AsyncAnthropic"):
                        rag = SimpleRAG()
                        contexts, metrics = await rag.retrieve_context([0.1] * 512)

        assert contexts == []
        assert metrics.num_results == 0
        assert metrics.top_score is None
        assert metrics.average_score is None
