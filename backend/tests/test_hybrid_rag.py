"""
Tests for HybridRAG - cascading retrieval combining dense and sparse search.
Tests BM25 scoring, score merging, and hybrid retrieval pipeline.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.rag.hybrid import HybridRAG, InMemoryBM25
from app.models.chat import Citation, RAGMode


class TestInMemoryBM25:
    """Tests for in-memory BM25 implementation."""

    def test_tokenize_lowercase_and_punctuation(self):
        """Test tokenization lowercases and removes punctuation."""
        bm25 = InMemoryBM25()
        result = bm25._tokenize("Hello, World! This is a TEST.")
        assert "hello" in result
        assert "world" in result
        assert "test" in result
        # No punctuation
        assert "," not in result
        assert "!" not in result

    def test_fit_calculates_document_lengths(self):
        """Test fit calculates document lengths correctly."""
        bm25 = InMemoryBM25()
        bm25.fit(["short doc", "this is a longer document with more words"])

        assert len(bm25.doc_lengths) == 2
        assert bm25.doc_lengths[0] == 2  # "short doc"
        assert bm25.doc_lengths[1] == 8  # 8 words

    def test_fit_calculates_average_doc_length(self):
        """Test fit calculates average document length."""
        bm25 = InMemoryBM25()
        bm25.fit(["one two", "one two three four"])

        # (2 + 4) / 2 = 3
        assert bm25.avg_doc_length == 3.0

    def test_fit_calculates_idf(self):
        """Test fit calculates IDF for terms."""
        bm25 = InMemoryBM25()
        bm25.fit(["cat dog", "cat bird", "fish"])

        # 'cat' appears in 2/3 docs
        assert "cat" in bm25.idf
        # 'fish' appears in 1/3 docs (should have higher IDF)
        assert "fish" in bm25.idf
        assert bm25.idf["fish"] > bm25.idf["cat"]

    def test_score_returns_scores_for_all_docs(self):
        """Test score returns a score for each document."""
        bm25 = InMemoryBM25()
        bm25.fit(["rag system", "machine learning", "vector database"])

        scores = bm25.score("rag")
        assert len(scores) == 3

    def test_score_higher_for_matching_terms(self):
        """Test documents with query terms score higher."""
        bm25 = InMemoryBM25()
        bm25.fit(
            [
                "retrieval augmented generation is powerful",
                "machine learning algorithms",
                "vector embeddings for search",
            ]
        )

        scores = bm25.score("retrieval augmented")
        # First doc should score highest (contains both query terms)
        assert scores[0] > scores[1]
        assert scores[0] > scores[2]

    def test_score_zero_for_no_matches(self):
        """Test documents with no matching terms score zero."""
        bm25 = InMemoryBM25()
        bm25.fit(["cats and dogs", "birds fly high"])

        scores = bm25.score("python programming")
        assert all(s == 0 for s in scores)

    def test_score_term_frequency_matters(self):
        """Test documents with repeated terms score higher."""
        bm25 = InMemoryBM25()
        bm25.fit(["rag rag rag", "rag is good"])

        scores = bm25.score("rag")
        # First doc has 'rag' 3 times vs once
        assert scores[0] > scores[1]

    def test_empty_corpus_handled(self):
        """Test empty corpus doesn't crash."""
        bm25 = InMemoryBM25()
        bm25.fit([])

        scores = bm25.score("test")
        assert scores == []


class TestHybridRAGInit:
    """Tests for HybridRAG initialization."""

    def test_initializes_clients(self):
        """Test HybridRAG initializes required clients."""
        with patch("app.rag.hybrid.AsyncOpenAI"):
            with patch("app.rag.hybrid.AsyncAnthropic"):
                with patch("app.rag.hybrid.get_pinecone_client") as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = HybridRAG()

        assert rag.openai_client is not None
        assert rag.anthropic_client is not None
        assert rag.index is not None
        assert isinstance(rag.bm25, InMemoryBM25)


class TestHybridRAGEmbedding:
    """Tests for query embedding."""

    @pytest.fixture
    def mock_hybrid_rag(self):
        """Create HybridRAG with mocked clients."""
        with patch("app.rag.hybrid.AsyncOpenAI"):
            with patch("app.rag.hybrid.AsyncAnthropic"):
                with patch("app.rag.hybrid.get_pinecone_client") as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = HybridRAG()

                    # Mock embedding response
                    mock_embed_response = MagicMock()
                    mock_embed_response.data = [MagicMock(embedding=[0.1] * 512)]
                    rag.openai_client.embeddings.create = AsyncMock(
                        return_value=mock_embed_response
                    )

                    return rag

    @pytest.mark.asyncio
    async def test_embed_query_returns_vector(self, mock_hybrid_rag):
        """Test embed_query returns embedding vector."""
        result = await mock_hybrid_rag.embed_query("What is RAG?")

        assert isinstance(result, list)
        assert len(result) == 512

    @pytest.mark.asyncio
    async def test_embed_query_calls_openai(self, mock_hybrid_rag):
        """Test embed_query calls OpenAI embeddings API."""
        await mock_hybrid_rag.embed_query("Test query")

        mock_hybrid_rag.openai_client.embeddings.create.assert_called_once()


class TestHybridRAGRetrieval:
    """Tests for hybrid retrieval."""

    @pytest.fixture
    def mock_hybrid_rag(self):
        """Create HybridRAG with mocked retrieval."""
        with patch("app.rag.hybrid.AsyncOpenAI"):
            with patch("app.rag.hybrid.AsyncAnthropic"):
                with patch("app.rag.hybrid.get_pinecone_client") as mock_pc:
                    mock_index = MagicMock()
                    mock_pc.return_value.get_index.return_value = mock_index

                    rag = HybridRAG()

                    # Mock embedding
                    mock_embed_response = MagicMock()
                    mock_embed_response.data = [MagicMock(embedding=[0.1] * 512)]
                    rag.openai_client.embeddings.create = AsyncMock(
                        return_value=mock_embed_response
                    )

                    # Mock dense retrieval results
                    mock_match1 = MagicMock()
                    mock_match1.id = "chunk1"
                    mock_match1.score = 0.9
                    mock_match1.metadata = {
                        "text": "RAG is retrieval augmented generation",
                        "source": "doc1.pdf",
                    }

                    mock_match2 = MagicMock()
                    mock_match2.id = "chunk2"
                    mock_match2.score = 0.7
                    mock_match2.metadata = {
                        "text": "Machine learning algorithms",
                        "source": "doc2.pdf",
                    }

                    mock_index.query.return_value = {
                        "matches": [mock_match1, mock_match2]
                    }

                    return rag

    @pytest.mark.asyncio
    async def test_retrieve_dense_returns_matches(self, mock_hybrid_rag):
        """Test dense retrieval returns matches."""
        embedding = [0.1] * 512
        result = await mock_hybrid_rag.retrieve_dense(
            embedding, top_k=10, namespace="test"
        )

        assert len(result) == 2
        assert result[0].id == "chunk1"

    def test_apply_bm25_scoring_adds_scores(self, mock_hybrid_rag):
        """Test BM25 scoring adds scores to matches."""
        mock_match = MagicMock()
        mock_match.id = "chunk1"
        mock_match.score = 0.9
        mock_match.metadata = {"text": "RAG retrieval generation"}

        result = mock_hybrid_rag.apply_bm25_scoring("RAG", [mock_match])

        assert len(result) == 1
        assert "bm25_score" in result[0].metadata
        assert "raw_bm25_score" in result[0].metadata

    def test_apply_bm25_empty_matches(self, mock_hybrid_rag):
        """Test BM25 scoring handles empty matches."""
        result = mock_hybrid_rag.apply_bm25_scoring("query", [])
        assert result == []

    def test_merge_scores_combines_dense_and_sparse(self, mock_hybrid_rag):
        """Test merge_scores combines dense and sparse scores."""
        mock_match = MagicMock()
        mock_match.id = "chunk1"
        mock_match.score = 0.8
        mock_match.metadata = {"text": "test", "source": "doc.pdf", "bm25_score": 0.6}

        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.dense_weight = 0.7
            mock_settings.sparse_weight = 0.3

            result = mock_hybrid_rag.merge_scores([mock_match])

        assert len(result) == 1
        # Expected: 0.8 * 0.7 + 0.6 * 0.3 = 0.56 + 0.18 = 0.74
        assert result[0]["score"] == pytest.approx(0.74)
        assert result[0]["dense_score"] == 0.8
        assert result[0]["sparse_score"] == 0.6

    def test_merge_scores_sorts_by_combined_score(self, mock_hybrid_rag):
        """Test merge_scores sorts results by combined score."""
        mock_match1 = MagicMock()
        mock_match1.id = "low"
        mock_match1.score = 0.5
        mock_match1.metadata = {"bm25_score": 0.3}

        mock_match2 = MagicMock()
        mock_match2.id = "high"
        mock_match2.score = 0.9
        mock_match2.metadata = {"bm25_score": 0.8}

        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.dense_weight = 0.5
            mock_settings.sparse_weight = 0.5

            result = mock_hybrid_rag.merge_scores([mock_match1, mock_match2])

        # Higher score should be first
        assert result[0]["id"] == "high"

    @pytest.mark.asyncio
    async def test_retrieve_hybrid_returns_contexts_and_metrics(self, mock_hybrid_rag):
        """Test retrieve_hybrid returns contexts and metrics."""
        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.top_k_results = 10
            mock_settings.dense_weight = 0.7
            mock_settings.sparse_weight = 0.3
            mock_settings.min_relevance_score = 0.0
            mock_settings.embedding_model = "text-embedding-3-small"

            contexts, metrics = await mock_hybrid_rag.retrieve_hybrid(
                "What is RAG?", namespace="test"
            )

        assert isinstance(contexts, list)
        assert hasattr(metrics, "query_time_ms")
        assert hasattr(metrics, "num_results")


class TestHybridRAGCitations:
    """Tests for citation creation."""

    @pytest.fixture
    def mock_hybrid_rag(self):
        """Create HybridRAG with mocked clients."""
        with patch("app.rag.hybrid.AsyncOpenAI"):
            with patch("app.rag.hybrid.AsyncAnthropic"):
                with patch("app.rag.hybrid.get_pinecone_client") as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()
                    return HybridRAG()

    def test_create_citations_from_contexts(self, mock_hybrid_rag):
        """Test create_citations creates Citation objects."""
        contexts = [
            {
                "source": "doc1.pdf",
                "page": 5,
                "chunk_id": "chunk1",
                "score": 0.85,
                "text": "This is sample text from the document.",
            }
        ]

        citations = mock_hybrid_rag.create_citations(contexts)

        assert len(citations) == 1
        assert isinstance(citations[0], Citation)
        assert citations[0].source == "doc1.pdf"
        assert citations[0].page == 5
        assert citations[0].relevance_score == 0.85

    def test_create_citations_truncates_preview(self, mock_hybrid_rag):
        """Test create_citations truncates text preview to 200 chars."""
        long_text = "x" * 500
        contexts = [{"source": "doc.pdf", "score": 0.8, "text": long_text}]

        citations = mock_hybrid_rag.create_citations(contexts)

        assert len(citations[0].text_preview) == 200

    def test_format_context_includes_hybrid_source(self, mock_hybrid_rag):
        """Test format_context shows retrieval source."""
        contexts = [
            {
                "source": "doc1.pdf",
                "page": 3,
                "text": "Sample text",
                "retrieval_source": "hybrid",
            }
        ]

        result = mock_hybrid_rag.format_context_for_prompt(contexts)

        assert "hybrid" in result
        assert "doc1.pdf" in result


class TestHybridRAGStreaming:
    """Tests for streaming query processing."""

    @pytest.fixture
    def mock_hybrid_rag(self):
        """Create HybridRAG with mocked streaming."""
        with patch("app.rag.hybrid.AsyncOpenAI"):
            with patch("app.rag.hybrid.AsyncAnthropic"):
                with patch("app.rag.hybrid.get_pinecone_client") as mock_pc:
                    mock_index = MagicMock()
                    mock_pc.return_value.get_index.return_value = mock_index

                    rag = HybridRAG()

                    # Mock embedding
                    mock_embed_response = MagicMock()
                    mock_embed_response.data = [MagicMock(embedding=[0.1] * 512)]
                    rag.openai_client.embeddings.create = AsyncMock(
                        return_value=mock_embed_response
                    )

                    # Mock retrieval
                    mock_match = MagicMock()
                    mock_match.id = "chunk1"
                    mock_match.score = 0.9
                    mock_match.metadata = {
                        "text": "RAG is powerful",
                        "source": "doc.pdf",
                    }
                    mock_index.query.return_value = {"matches": [mock_match]}

                    # Mock streaming response
                    mock_stream = MagicMock()
                    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
                    mock_stream.__aexit__ = AsyncMock(return_value=None)

                    async def mock_text_stream():
                        yield "Response "
                        yield "text"

                    mock_stream.text_stream = mock_text_stream()
                    rag.anthropic_client.messages.stream = MagicMock(
                        return_value=mock_stream
                    )

                    return rag

    @pytest.mark.asyncio
    async def test_process_query_streaming_yields_mode(self, mock_hybrid_rag):
        """Test streaming yields mode chunk first."""
        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.top_k_results = 5
            mock_settings.dense_weight = 0.7
            mock_settings.sparse_weight = 0.3
            mock_settings.min_relevance_score = 0.0
            mock_settings.embedding_model = "text-embedding-3-small"
            mock_settings.anthropic_model = "claude-3-haiku"

            chunks = []
            async for chunk in mock_hybrid_rag.process_query_streaming(
                "test query", namespace="test"
            ):
                chunks.append(chunk)

        mode_chunks = [c for c in chunks if c.type == "mode"]
        assert len(mode_chunks) >= 1
        assert mode_chunks[0].mode == RAGMode.HYBRID

    @pytest.mark.asyncio
    async def test_process_query_streaming_yields_citations(self, mock_hybrid_rag):
        """Test streaming yields citation chunks."""
        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.top_k_results = 5
            mock_settings.dense_weight = 0.7
            mock_settings.sparse_weight = 0.3
            mock_settings.min_relevance_score = 0.0
            mock_settings.embedding_model = "text-embedding-3-small"
            mock_settings.anthropic_model = "claude-3-haiku"

            chunks = []
            async for chunk in mock_hybrid_rag.process_query_streaming(
                "test query", namespace="test"
            ):
                chunks.append(chunk)

        citation_chunks = [c for c in chunks if c.type == "citation"]
        assert len(citation_chunks) >= 1

    @pytest.mark.asyncio
    async def test_process_query_streaming_yields_tokens(self, mock_hybrid_rag):
        """Test streaming yields response tokens."""
        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.top_k_results = 5
            mock_settings.dense_weight = 0.7
            mock_settings.sparse_weight = 0.3
            mock_settings.min_relevance_score = 0.0
            mock_settings.embedding_model = "text-embedding-3-small"
            mock_settings.anthropic_model = "claude-3-haiku"

            chunks = []
            async for chunk in mock_hybrid_rag.process_query_streaming(
                "test query", namespace="test"
            ):
                chunks.append(chunk)

        token_chunks = [c for c in chunks if c.type == "token"]
        assert len(token_chunks) >= 1

    @pytest.mark.asyncio
    async def test_process_query_streaming_yields_done(self, mock_hybrid_rag):
        """Test streaming yields done chunk with metrics."""
        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.top_k_results = 5
            mock_settings.dense_weight = 0.7
            mock_settings.sparse_weight = 0.3
            mock_settings.min_relevance_score = 0.0
            mock_settings.embedding_model = "text-embedding-3-small"
            mock_settings.anthropic_model = "claude-3-haiku"

            chunks = []
            async for chunk in mock_hybrid_rag.process_query_streaming(
                "test query", namespace="test"
            ):
                chunks.append(chunk)

        done_chunks = [c for c in chunks if c.type == "done"]
        assert len(done_chunks) == 1
        assert done_chunks[0].metrics is not None


class TestHybridRAGErrorHandling:
    """Tests for error handling."""

    @pytest.fixture
    def error_hybrid_rag(self):
        """Create HybridRAG that throws errors."""
        with patch("app.rag.hybrid.AsyncOpenAI"):
            with patch("app.rag.hybrid.AsyncAnthropic"):
                with patch("app.rag.hybrid.get_pinecone_client") as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = HybridRAG()

                    # Make embedding fail
                    rag.openai_client.embeddings.create = AsyncMock(
                        side_effect=Exception("Embedding failed")
                    )

                    return rag

    @pytest.mark.asyncio
    async def test_embed_query_raises_on_error(self, error_hybrid_rag):
        """Test embed_query raises exception on failure."""
        with pytest.raises(Exception) as exc_info:
            await error_hybrid_rag.embed_query("test")

        assert "Embedding failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_streaming_yields_error_chunk_on_failure(self, error_hybrid_rag):
        """Test streaming yields error chunk on failure."""
        with patch("app.rag.hybrid.settings") as mock_settings:
            mock_settings.embedding_model = "text-embedding-3-small"

            chunks = []
            async for chunk in error_hybrid_rag.process_query_streaming("test"):
                chunks.append(chunk)

        error_chunks = [c for c in chunks if c.type == "error"]
        assert len(error_chunks) >= 1
        assert "Embedding failed" in error_chunks[0].content
