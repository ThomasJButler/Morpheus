"""
Tests for AgenticRAG - intelligent RAG using Claude's tool use capability.
Tests tool definitions, execution, citation extraction, and streaming.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.rag.agentic import AgenticRAG
from app.models.chat import Citation, RAGMode, StreamChunk


class TestAgenticRAGInit:
    """Tests for AgenticRAG initialization."""

    def test_initializes_clients(self):
        """Test AgenticRAG initializes required clients."""
        with patch('app.rag.agentic.AsyncAnthropic') as mock_anthropic:
            with patch('app.rag.agentic.AsyncOpenAI') as mock_openai:
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = AgenticRAG()

        assert rag.anthropic_client is not None
        assert rag.openai_client is not None
        assert rag.index is not None
        assert rag.tools is not None

    def test_defines_search_tools(self):
        """Test AgenticRAG defines search tools correctly."""
        with patch('app.rag.agentic.AsyncAnthropic'):
            with patch('app.rag.agentic.AsyncOpenAI'):
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = AgenticRAG()

        # Should have search_knowledge_base and rewrite_query tools
        tool_names = [t["name"] for t in rag.tools]
        assert "search_knowledge_base" in tool_names
        assert "rewrite_query" in tool_names

    def test_search_tool_has_correct_schema(self):
        """Test search_knowledge_base tool has correct schema."""
        with patch('app.rag.agentic.AsyncAnthropic'):
            with patch('app.rag.agentic.AsyncOpenAI'):
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = AgenticRAG()

        search_tool = next(t for t in rag.tools if t["name"] == "search_knowledge_base")
        schema = search_tool["input_schema"]

        assert "query" in schema["properties"]
        assert "top_k" in schema["properties"]
        assert "query" in schema["required"]


class TestAgenticRAGToolExecution:
    """Tests for tool execution."""

    @pytest.fixture
    def mock_agentic_rag(self):
        """Create AgenticRAG with mocked clients."""
        with patch('app.rag.agentic.AsyncAnthropic'):
            with patch('app.rag.agentic.AsyncOpenAI') as mock_openai:
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_index = MagicMock()
                    mock_pc.return_value.get_index.return_value = mock_index

                    rag = AgenticRAG()

                    # Mock embedding
                    mock_embed_response = MagicMock()
                    mock_embed_response.data = [MagicMock(embedding=[0.1] * 512)]
                    rag.openai_client.embeddings.create = AsyncMock(
                        return_value=mock_embed_response
                    )

                    # Mock search results
                    mock_match = MagicMock()
                    mock_match.id = "chunk1"
                    mock_match.score = 0.85
                    mock_match.metadata = {
                        "text": "RAG is retrieval augmented generation",
                        "source": "doc.pdf",
                        "page": 5
                    }
                    mock_index.query.return_value = {"matches": [mock_match]}

                    return rag

    @pytest.mark.asyncio
    async def test_execute_search_tool(self, mock_agentic_rag):
        """Test search_knowledge_base tool execution."""
        result = await mock_agentic_rag._execute_tool(
            "search_knowledge_base",
            {"query": "What is RAG?", "top_k": 5},
            namespace="test"
        )

        assert result["success"] is True
        assert result["query"] == "What is RAG?"
        assert result["num_results"] == 1
        assert len(result["results"]) == 1

    @pytest.mark.asyncio
    async def test_execute_rewrite_tool(self, mock_agentic_rag):
        """Test rewrite_query tool execution."""
        result = await mock_agentic_rag._execute_tool(
            "rewrite_query",
            {
                "original_query": "what is that?",
                "rewritten_query": "What is RAG?",
                "reasoning": "Made query more specific"
            },
            namespace="test"
        )

        assert result["success"] is True
        assert result["original_query"] == "what is that?"
        assert result["rewritten_query"] == "What is RAG?"

    @pytest.mark.asyncio
    async def test_execute_unknown_tool(self, mock_agentic_rag):
        """Test unknown tool returns error."""
        result = await mock_agentic_rag._execute_tool(
            "unknown_tool",
            {},
            namespace="test"
        )

        assert result["success"] is False
        assert "Unknown tool" in result["error"]


class TestAgenticRAGFormatting:
    """Tests for result formatting."""

    @pytest.fixture
    def mock_agentic_rag(self):
        """Create AgenticRAG with mocked clients."""
        with patch('app.rag.agentic.AsyncAnthropic'):
            with patch('app.rag.agentic.AsyncOpenAI'):
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()
                    return AgenticRAG()

    def test_format_search_results(self, mock_agentic_rag):
        """Test formatting of search results."""
        tool_result = {
            "success": True,
            "query": "test",
            "num_results": 1,
            "results": [
                {
                    "text": "Sample text",
                    "source": "doc.pdf",
                    "page": 3,
                    "score": 0.85
                }
            ]
        }

        formatted = mock_agentic_rag._format_tool_result(tool_result)

        assert "Result 1" in formatted
        assert "doc.pdf" in formatted
        assert "Page 3" in formatted
        assert "Sample text" in formatted

    def test_format_empty_search_results(self, mock_agentic_rag):
        """Test formatting of empty search results."""
        tool_result = {
            "success": True,
            "query": "test",
            "num_results": 0,
            "results": []
        }

        formatted = mock_agentic_rag._format_tool_result(tool_result)
        assert "No relevant information" in formatted

    def test_format_rewrite_result(self, mock_agentic_rag):
        """Test formatting of query rewrite result."""
        tool_result = {
            "success": True,
            "original_query": "what is it?",
            "rewritten_query": "What is RAG?"
        }

        formatted = mock_agentic_rag._format_tool_result(tool_result)

        assert "what is it?" in formatted
        assert "What is RAG?" in formatted

    def test_format_failed_result(self, mock_agentic_rag):
        """Test formatting of failed tool result."""
        tool_result = {
            "success": False,
            "error": "Something went wrong"
        }

        formatted = mock_agentic_rag._format_tool_result(tool_result)
        assert "failed" in formatted
        assert "Something went wrong" in formatted


class TestAgenticRAGCitations:
    """Tests for citation extraction."""

    @pytest.fixture
    def mock_agentic_rag(self):
        """Create AgenticRAG with mocked clients."""
        with patch('app.rag.agentic.AsyncAnthropic'):
            with patch('app.rag.agentic.AsyncOpenAI'):
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()
                    return AgenticRAG()

    def test_extract_citations_from_results(self, mock_agentic_rag):
        """Test citation extraction from search results."""
        search_results = [
            {
                "success": True,
                "results": [
                    {
                        "source": "doc1.pdf",
                        "page": 5,
                        "chunk_id": "chunk1",
                        "score": 0.9,
                        "text": "This is sample text from the document."
                    }
                ]
            }
        ]

        citations = mock_agentic_rag._extract_citations(search_results)

        assert len(citations) == 1
        assert isinstance(citations[0], Citation)
        assert citations[0].source == "doc1.pdf"
        assert citations[0].page == 5
        assert citations[0].relevance_score == 0.9

    def test_extract_citations_deduplicates(self, mock_agentic_rag):
        """Test citation extraction deduplicates by chunk_id."""
        search_results = [
            {
                "success": True,
                "results": [
                    {"source": "doc.pdf", "chunk_id": "chunk1", "score": 0.9, "text": "..."},
                    {"source": "doc.pdf", "chunk_id": "chunk1", "score": 0.85, "text": "..."},
                ]
            }
        ]

        citations = mock_agentic_rag._extract_citations(search_results)

        # Should deduplicate
        assert len(citations) == 1

    def test_extract_citations_from_multiple_searches(self, mock_agentic_rag):
        """Test citation extraction from multiple search results."""
        search_results = [
            {
                "success": True,
                "results": [
                    {"source": "doc1.pdf", "chunk_id": "chunk1", "score": 0.9, "text": "..."}
                ]
            },
            {
                "success": True,
                "results": [
                    {"source": "doc2.pdf", "chunk_id": "chunk2", "score": 0.8, "text": "..."}
                ]
            }
        ]

        citations = mock_agentic_rag._extract_citations(search_results)

        assert len(citations) == 2

    def test_extract_citations_empty_results(self, mock_agentic_rag):
        """Test citation extraction with no results."""
        citations = mock_agentic_rag._extract_citations([])
        assert citations == []


class TestAgenticRAGStreaming:
    """Tests for streaming query processing."""

    @pytest.fixture
    def mock_agentic_rag(self):
        """Create AgenticRAG with mocked streaming."""
        with patch('app.rag.agentic.AsyncAnthropic') as mock_anthropic:
            with patch('app.rag.agentic.AsyncOpenAI') as mock_openai:
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_index = MagicMock()
                    mock_pc.return_value.get_index.return_value = mock_index

                    rag = AgenticRAG()

                    # Mock embedding
                    mock_embed_response = MagicMock()
                    mock_embed_response.data = [MagicMock(embedding=[0.1] * 512)]
                    rag.openai_client.embeddings.create = AsyncMock(
                        return_value=mock_embed_response
                    )

                    # Mock search results
                    mock_match = MagicMock()
                    mock_match.id = "chunk1"
                    mock_match.score = 0.85
                    mock_match.metadata = {
                        "text": "RAG content",
                        "source": "doc.pdf"
                    }
                    mock_index.query.return_value = {"matches": [mock_match]}

                    # Mock simple Claude response (no tool use)
                    mock_stream = MagicMock()
                    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
                    mock_stream.__aexit__ = AsyncMock(return_value=None)

                    # Create mock final message with text only (no tool use)
                    mock_text_block = MagicMock()
                    mock_text_block.text = "This is the response."
                    mock_text_block.type = "text"

                    mock_final_message = MagicMock()
                    mock_final_message.content = [mock_text_block]

                    mock_stream.get_final_message = AsyncMock(return_value=mock_final_message)

                    async def mock_text_stream():
                        yield "Response "
                        yield "text"

                    mock_stream.text_stream = mock_text_stream()
                    rag.anthropic_client.messages.stream = MagicMock(return_value=mock_stream)

                    return rag

    @pytest.mark.asyncio
    async def test_process_query_streaming_yields_mode(self, mock_agentic_rag):
        """Test streaming yields mode chunk first."""
        with patch('app.rag.agentic.settings') as mock_settings:
            mock_settings.agentic_timeout_seconds = 30
            mock_settings.agentic_max_tool_calls = 5
            mock_settings.anthropic_model = "claude-3-haiku"
            mock_settings.embedding_model = "text-embedding-3-small"

            chunks = []
            async for chunk in mock_agentic_rag.process_query_streaming(
                "test query", namespace="test"
            ):
                chunks.append(chunk)

        mode_chunks = [c for c in chunks if c.type == "mode"]
        assert len(mode_chunks) >= 1
        assert mode_chunks[0].mode == RAGMode.AGENTIC

    @pytest.mark.asyncio
    async def test_process_query_streaming_yields_tokens(self, mock_agentic_rag):
        """Test streaming yields response tokens."""
        with patch('app.rag.agentic.settings') as mock_settings:
            mock_settings.agentic_timeout_seconds = 30
            mock_settings.agentic_max_tool_calls = 5
            mock_settings.anthropic_model = "claude-3-haiku"
            mock_settings.embedding_model = "text-embedding-3-small"

            chunks = []
            async for chunk in mock_agentic_rag.process_query_streaming(
                "test query", namespace="test"
            ):
                chunks.append(chunk)

        token_chunks = [c for c in chunks if c.type == "token"]
        assert len(token_chunks) >= 1

    @pytest.mark.asyncio
    async def test_process_query_streaming_yields_done(self, mock_agentic_rag):
        """Test streaming yields done chunk with metrics."""
        with patch('app.rag.agentic.settings') as mock_settings:
            mock_settings.agentic_timeout_seconds = 30
            mock_settings.agentic_max_tool_calls = 5
            mock_settings.anthropic_model = "claude-3-haiku"
            mock_settings.embedding_model = "text-embedding-3-small"

            chunks = []
            async for chunk in mock_agentic_rag.process_query_streaming(
                "test query", namespace="test"
            ):
                chunks.append(chunk)

        done_chunks = [c for c in chunks if c.type == "done"]
        assert len(done_chunks) >= 1


class TestAgenticRAGWithToolUse:
    """Tests for AgenticRAG tool use detection.

    Note: Full tool use streaming requires complex mocking of Claude's
    multi-turn conversation. These tests verify tool definitions and
    the underlying tool execution logic, which is tested above.
    """

    @pytest.fixture
    def mock_agentic_rag(self):
        """Create AgenticRAG with mocked clients."""
        with patch('app.rag.agentic.AsyncAnthropic'):
            with patch('app.rag.agentic.AsyncOpenAI') as mock_openai:
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_index = MagicMock()
                    mock_pc.return_value.get_index.return_value = mock_index

                    rag = AgenticRAG()

                    # Mock embedding
                    mock_embed_response = MagicMock()
                    mock_embed_response.data = [MagicMock(embedding=[0.1] * 512)]
                    rag.openai_client.embeddings.create = AsyncMock(
                        return_value=mock_embed_response
                    )

                    # Mock search results
                    mock_match = MagicMock()
                    mock_match.id = "chunk1"
                    mock_match.score = 0.85
                    mock_match.metadata = {
                        "text": "RAG is powerful",
                        "source": "doc.pdf"
                    }
                    mock_index.query.return_value = {"matches": [mock_match]}

                    return rag

    def test_tools_defined_for_claude(self, mock_agentic_rag):
        """Test that tools are properly defined for Claude API."""
        tools = mock_agentic_rag.tools

        assert len(tools) == 2

        # Verify search tool
        search_tool = next(t for t in tools if t["name"] == "search_knowledge_base")
        assert "description" in search_tool
        assert "input_schema" in search_tool
        assert search_tool["input_schema"]["properties"]["query"]["type"] == "string"

        # Verify rewrite tool
        rewrite_tool = next(t for t in tools if t["name"] == "rewrite_query")
        assert "description" in rewrite_tool
        assert "original_query" in rewrite_tool["input_schema"]["properties"]
        assert "rewritten_query" in rewrite_tool["input_schema"]["properties"]

    @pytest.mark.asyncio
    async def test_search_tool_executes_correctly(self, mock_agentic_rag):
        """Test that search_knowledge_base tool works when called."""
        result = await mock_agentic_rag._execute_tool(
            "search_knowledge_base",
            {"query": "What is RAG?", "top_k": 5},
            namespace="test"
        )

        assert result["success"] is True
        assert "results" in result
        assert len(result["results"]) == 1
        assert result["results"][0]["source"] == "doc.pdf"

    @pytest.mark.asyncio
    async def test_rewrite_tool_logs_rewrite(self, mock_agentic_rag):
        """Test that rewrite_query tool works when called."""
        result = await mock_agentic_rag._execute_tool(
            "rewrite_query",
            {
                "original_query": "what?",
                "rewritten_query": "What is RAG?",
                "reasoning": "Made more specific"
            },
            namespace="test"
        )

        assert result["success"] is True
        assert result["rewritten_query"] == "What is RAG?"


class TestAgenticRAGErrorHandling:
    """Tests for error handling."""

    @pytest.fixture
    def error_agentic_rag(self):
        """Create AgenticRAG that throws errors."""
        with patch('app.rag.agentic.AsyncAnthropic') as mock_anthropic:
            with patch('app.rag.agentic.AsyncOpenAI'):
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = AgenticRAG()

                    # Make stream fail
                    mock_stream = MagicMock()
                    mock_stream.__aenter__ = AsyncMock(side_effect=Exception("API Error"))
                    rag.anthropic_client.messages.stream = MagicMock(return_value=mock_stream)

                    return rag

    @pytest.mark.asyncio
    async def test_streaming_yields_error_chunk_on_failure(self, error_agentic_rag):
        """Test streaming yields error chunk on failure."""
        with patch('app.rag.agentic.settings') as mock_settings:
            mock_settings.agentic_timeout_seconds = 30
            mock_settings.anthropic_model = "claude-3-haiku"

            chunks = []
            async for chunk in error_agentic_rag.process_query_streaming("test"):
                chunks.append(chunk)

        error_chunks = [c for c in chunks if c.type == "error"]
        assert len(error_chunks) >= 1


class TestAgenticRAGNonStreaming:
    """Tests for non-streaming process_query."""

    @pytest.fixture
    def mock_agentic_rag(self):
        """Create AgenticRAG for non-streaming tests."""
        with patch('app.rag.agentic.AsyncAnthropic') as mock_anthropic:
            with patch('app.rag.agentic.AsyncOpenAI'):
                with patch('app.rag.agentic.get_pinecone_client') as mock_pc:
                    mock_pc.return_value.get_index.return_value = MagicMock()

                    rag = AgenticRAG()

                    # Mock simple response
                    mock_stream = MagicMock()
                    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
                    mock_stream.__aexit__ = AsyncMock(return_value=None)

                    mock_text_block = MagicMock()
                    mock_text_block.text = "Response text"
                    mock_text_block.type = "text"

                    mock_final_message = MagicMock()
                    mock_final_message.content = [mock_text_block]

                    mock_stream.get_final_message = AsyncMock(return_value=mock_final_message)
                    mock_stream.text_stream = AsyncMock()

                    rag.anthropic_client.messages.stream = MagicMock(return_value=mock_stream)

                    return rag

    @pytest.mark.asyncio
    async def test_process_query_returns_tuple(self, mock_agentic_rag):
        """Test non-streaming returns (response, citations, metrics) tuple."""
        with patch('app.rag.agentic.settings') as mock_settings:
            mock_settings.agentic_timeout_seconds = 30
            mock_settings.agentic_max_tool_calls = 5
            mock_settings.anthropic_model = "claude-3-haiku"

            response, citations, metrics = await mock_agentic_rag.process_query(
                "What is RAG?", namespace="test"
            )

        assert isinstance(response, str)
        assert isinstance(citations, list)
        assert metrics is not None
