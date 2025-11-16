"""
Tests for chat API endpoints.
Tests /api/chat, /api/health, and /api/modes endpoints.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.chat import RAGMode


class TestChatEndpoint:
    """Tests for POST /api/chat endpoint."""

    @patch("app.api.chat.simple_rag")
    def test_chat_simple_mode_no_stream(
        self,
        mock_simple_rag,
        test_client: TestClient,
        sample_chat_message: dict
    ):
        """Test chat with simple mode, non-streaming."""
        # Setup mock
        mock_simple_rag.process_query = AsyncMock(
            return_value=(
                "This is a test response.",
                [{"text": "citation", "source": "test.txt", "score": 0.95}],
                MagicMock(query_time_ms=123.45, total_chunks=3)
            )
        )

        response = test_client.post("/api/chat", json=sample_chat_message)

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "citations" in data
        assert data["mode"] == "simple"
        assert len(data["citations"]) == 1

    @patch("app.api.chat.hybrid_rag")
    def test_chat_hybrid_mode_no_stream(
        self,
        mock_hybrid_rag,
        test_client: TestClient
    ):
        """Test chat with hybrid mode, non-streaming."""
        # Setup mock
        mock_hybrid_rag.process_query = AsyncMock(
            return_value=(
                "Hybrid response.",
                [],
                MagicMock(query_time_ms=200.0, total_chunks=5)
            )
        )

        request = {
            "message": "Test query",
            "mode": "hybrid",
            "stream": False
        }

        response = test_client.post("/api/chat", json=request)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Hybrid response."
        assert data["mode"] == "hybrid"

    @patch("app.api.chat.get_agentic_rag")
    def test_chat_agentic_mode_no_stream(
        self,
        mock_get_agentic,
        test_client: TestClient
    ):
        """Test chat with agentic mode, non-streaming."""
        # Setup mock
        mock_agentic = MagicMock()
        mock_agentic.process_query = AsyncMock(
            return_value=(
                "Agentic response with tool use.",
                [{"text": "context", "source": "doc.pdf", "score": 0.92}],
                MagicMock(query_time_ms=500.0, total_chunks=10)
            )
        )
        mock_get_agentic.return_value = mock_agentic

        request = {
            "message": "Complex query requiring tool use",
            "mode": "agentic",
            "stream": False
        }

        response = test_client.post("/api/chat", json=request)

        assert response.status_code == 200
        data = response.json()
        assert "Agentic response" in data["message"]
        assert data["mode"] == "agentic"

    def test_chat_empty_message(self, test_client: TestClient):
        """Test chat with empty message."""
        request = {
            "message": "",
            "mode": "simple",
            "stream": False
        }

        response = test_client.post("/api/chat", json=request)

        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_chat_whitespace_only_message(self, test_client: TestClient):
        """Test chat with whitespace-only message."""
        request = {
            "message": "   \n\t  ",
            "mode": "simple",
            "stream": False
        }

        response = test_client.post("/api/chat", json=request)

        assert response.status_code == 400

    @patch("app.api.chat.simple_rag")
    def test_chat_with_session_id(
        self,
        mock_simple_rag,
        test_client: TestClient
    ):
        """Test chat with session ID for conversation tracking."""
        mock_simple_rag.process_query = AsyncMock(
            return_value=(
                "Response",
                [],
                MagicMock(query_time_ms=100.0, total_chunks=1)
            )
        )

        request = {
            "message": "Test with session",
            "mode": "simple",
            "stream": False,
            "session_id": "test-session-456"
        }

        response = test_client.post("/api/chat", json=request)

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "test-session-456"

    @patch("app.api.chat.simple_rag")
    def test_chat_streaming_mode(
        self,
        mock_simple_rag,
        test_client: TestClient
    ):
        """Test chat with streaming enabled."""
        # Setup mock streaming
        async def mock_stream(message):
            from app.models.chat import StreamChunk
            yield StreamChunk(type="text", content="Part 1")
            yield StreamChunk(type="text", content=" Part 2")
            yield StreamChunk(type="done", content="")

        mock_simple_rag.process_query_streaming = mock_stream

        request = {
            "message": "Test streaming",
            "mode": "simple",
            "stream": True
        }

        response = test_client.post("/api/chat", json=request)

        # Streaming responses return 200 and event-stream content type
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

    @patch("app.api.chat.simple_rag")
    def test_chat_handles_rag_error(
        self,
        mock_simple_rag,
        test_client: TestClient
    ):
        """Test error handling when RAG pipeline fails."""
        # Mock to raise exception
        mock_simple_rag.process_query = AsyncMock(
            side_effect=Exception("RAG processing failed")
        )

        request = {
            "message": "Test error handling",
            "mode": "simple",
            "stream": False
        }

        response = test_client.post("/api/chat", json=request)

        assert response.status_code == 500
        assert "error" in response.json()["detail"].lower()


class TestHealthEndpoint:
    """Tests for GET /api/health endpoint."""

    @patch("app.api.chat.get_pinecone_client")
    def test_health_check_healthy(
        self,
        mock_pinecone,
        test_client: TestClient
    ):
        """Test health check when service is healthy."""
        # Setup mock
        mock_client = MagicMock()
        mock_client.index_stats.return_value = {
            "dense": {"total_vector_count": 100}
        }
        mock_pinecone.return_value = mock_client

        response = test_client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["pinecone_connected"] is True
        assert "index_stats" in data

    @patch("app.api.chat.get_pinecone_client")
    def test_health_check_unhealthy(
        self,
        mock_pinecone,
        test_client: TestClient
    ):
        """Test health check when service is unhealthy."""
        # Mock Pinecone failure
        mock_pinecone.side_effect = Exception("Connection failed")

        response = test_client.get("/api/health")

        assert response.status_code == 200  # Returns 200 even when unhealthy
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["pinecone_connected"] is False
        assert "error" in data


class TestModesEndpoint:
    """Tests for GET /api/modes endpoint."""

    def test_list_modes(self, test_client: TestClient):
        """Test listing all available RAG modes."""
        response = test_client.get("/api/modes")

        assert response.status_code == 200
        data = response.json()
        assert "modes" in data
        assert len(data["modes"]) >= 4  # simple, hybrid, cascading, agentic

        # Check mode structure
        for mode in data["modes"]:
            assert "name" in mode
            assert "description" in mode
            assert "status" in mode

    def test_modes_includes_all_types(self, test_client: TestClient):
        """Test that all RAG mode types are included."""
        response = test_client.get("/api/modes")

        data = response.json()
        mode_names = [m["name"] for m in data["modes"]]

        assert "simple" in mode_names
        assert "hybrid" in mode_names
        assert "agentic" in mode_names


@pytest.mark.integration
class TestChatIntegration:
    """Integration tests with real services."""

    def test_chat_full_pipeline(self, test_client: TestClient):
        """
        Full integration test with real APIs.
        Requires API keys - skipped by default.
        """
        pytest.skip("Integration test - requires API keys and indexed documents")

        request = {
            "message": "What is the main topic?",
            "mode": "simple",
            "stream": False
        }

        response = test_client.post("/api/chat", json=request)

        assert response.status_code == 200
        data = response.json()
        assert len(data["message"]) > 0
