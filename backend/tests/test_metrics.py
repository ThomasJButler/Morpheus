"""
Tests for metrics and monitoring API endpoints.
Tests /api/metrics/* endpoints for performance monitoring and A/B testing.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestCompareEndpoint:
    """Tests for GET /api/metrics/compare endpoint."""

    @patch("app.api.metrics.SimpleRAG")
    @patch("app.api.metrics.HybridRAG")
    def test_compare_modes_without_agentic(
        self, mock_hybrid_class, mock_simple_class, test_client: TestClient
    ):
        """Test RAG mode comparison without agentic mode."""
        # Setup simple RAG mock
        mock_simple = MagicMock()
        mock_simple.process_query = AsyncMock(
            return_value=(
                "Simple response",
                [{"text": "ctx", "source": "test.txt", "score": 0.9}],
                MagicMock(query_time_ms=100.0, num_results=3),
            )
        )
        mock_simple_class.return_value = mock_simple

        # Setup hybrid RAG mock
        mock_hybrid = MagicMock()
        mock_hybrid.process_query = AsyncMock(
            return_value=(
                "Hybrid response",
                [{"text": "ctx1", "source": "test.txt", "score": 0.95}],
                MagicMock(query_time_ms=150.0, num_results=5),
            )
        )
        mock_hybrid_class.return_value = mock_hybrid

        response = test_client.get(
            "/api/metrics/compare",
            params={"query": "test query", "include_agentic": False},
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "simple" in data["results"]
        assert "hybrid" in data["results"]
        assert "agentic" not in data["results"]
        assert data["results"]["simple"]["success"] is True
        assert data["results"]["hybrid"]["success"] is True

    @patch("app.api.metrics.AgenticRAG")
    @patch("app.api.metrics.SimpleRAG")
    @patch("app.api.metrics.HybridRAG")
    def test_compare_modes_with_agentic(
        self,
        mock_hybrid_class,
        mock_simple_class,
        mock_agentic_class,
        test_client: TestClient,
    ):
        """Test RAG mode comparison including agentic mode."""
        # Setup mocks
        for mock_class, time_ms in [
            (mock_simple_class, 100.0),
            (mock_hybrid_class, 150.0),
            (mock_agentic_class, 500.0),
        ]:
            mock_instance = MagicMock()
            mock_instance.process_query = AsyncMock(
                return_value=(
                    "Response",
                    [],
                    MagicMock(query_time_ms=time_ms, num_results=5),
                )
            )
            mock_class.return_value = mock_instance

        response = test_client.get(
            "/api/metrics/compare",
            params={"query": "test query", "include_agentic": True},
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "simple" in data["results"]
        assert "hybrid" in data["results"]
        assert "agentic" in data["results"]
        assert "summary" in data
        assert "fastest_mode" in data["summary"]

    @patch("app.api.metrics.SimpleRAG")
    @patch("app.api.metrics.HybridRAG")
    def test_compare_handles_mode_failure(
        self, mock_hybrid_class, mock_simple_class, test_client: TestClient
    ):
        """Test comparison when one mode fails."""
        # Simple succeeds
        mock_simple = MagicMock()
        mock_simple.process_query = AsyncMock(
            return_value=("Response", [], MagicMock(query_time_ms=100.0, num_results=3))
        )
        mock_simple_class.return_value = mock_simple

        # Hybrid fails
        mock_hybrid = MagicMock()
        mock_hybrid.process_query = AsyncMock(side_effect=Exception("Hybrid failed"))
        mock_hybrid_class.return_value = mock_hybrid

        response = test_client.get(
            "/api/metrics/compare", params={"query": "test query"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["results"]["simple"]["success"] is True
        assert data["results"]["hybrid"]["success"] is False
        assert "error" in data["results"]["hybrid"]

    def test_compare_missing_query(self, test_client: TestClient):
        """Test comparison without required query parameter."""
        response = test_client.get("/api/metrics/compare")

        assert response.status_code == 422  # Validation error


class TestSessionMetrics:
    """Tests for session management endpoints."""

    @patch("app.api.metrics.get_session_manager")
    def test_get_session_metrics(self, mock_session_manager, test_client: TestClient):
        """Test GET /api/metrics/sessions endpoint."""
        # Setup mock
        mock_manager = MagicMock()
        mock_manager.get_session_stats.return_value = {
            "total_sessions": 10,
            "active_sessions": 7,
            "expired_sessions": 3,
        }
        mock_session_manager.return_value = mock_manager

        response = test_client.get("/api/metrics/sessions")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
        assert data["stats"]["total_sessions"] == 10

    @patch("app.api.metrics.get_session_manager")
    def test_session_metrics_error(self, mock_session_manager, test_client: TestClient):
        """Test session metrics when manager fails."""
        mock_session_manager.side_effect = Exception("Manager error")

        response = test_client.get("/api/metrics/sessions")

        assert response.status_code == 500

    @patch("app.api.metrics.get_session_manager")
    def test_cleanup_expired_sessions(
        self, mock_session_manager, test_client: TestClient
    ):
        """Test POST /api/metrics/sessions/cleanup endpoint."""
        # Setup mock
        mock_manager = MagicMock()
        mock_manager.get_session_stats.side_effect = [
            {"total_sessions": 15},  # Before cleanup
            {"total_sessions": 10},  # After cleanup
        ]
        mock_session_manager.return_value = mock_manager

        response = test_client.post("/api/metrics/sessions/cleanup")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["sessions_before"] == 15
        assert data["sessions_after"] == 10
        assert data["sessions_removed"] == 5


class TestPerformanceEndpoint:
    """Tests for GET /api/metrics/performance endpoint."""

    @patch("app.api.metrics.HybridRAG")
    def test_performance_benchmark(self, mock_hybrid_class, test_client: TestClient):
        """Test performance benchmarking."""
        # Setup mock to return varying times
        mock_hybrid = MagicMock()
        call_count = [0]

        async def mock_query(query):
            call_count[0] += 1
            time_ms = 100.0 + (call_count[0] * 10)  # Increasing times
            return (
                "Response",
                [{"text": "ctx", "source": "test.txt"}],
                MagicMock(query_time_ms=time_ms, num_results=5),
            )

        mock_hybrid.process_query = mock_query
        mock_hybrid_class.return_value = mock_hybrid

        response = test_client.get(
            "/api/metrics/performance", params={"query": "test query", "iterations": 3}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["iterations"] == 3
        assert "performance" in data
        assert "average_time_ms" in data["performance"]
        assert "raw_timings" in data
        assert len(data["raw_timings"]) == 3

    def test_performance_invalid_iterations(self, test_client: TestClient):
        """Test performance with invalid iteration count."""
        # Too many iterations
        response = test_client.get(
            "/api/metrics/performance", params={"query": "test", "iterations": 20}
        )

        assert response.status_code == 422  # Validation error

        # Zero iterations
        response = test_client.get(
            "/api/metrics/performance", params={"query": "test", "iterations": 0}
        )

        assert response.status_code == 422


class TestHealthDetailed:
    """Tests for GET /api/metrics/health-detailed endpoint."""

    @patch("app.api.metrics.get_session_manager")
    @patch("app.api.metrics.get_pinecone_client")
    @patch("app.api.metrics.SimpleRAG")
    def test_detailed_health_all_healthy(
        self,
        mock_simple_class,
        mock_pinecone,
        mock_session_manager,
        test_client: TestClient,
    ):
        """Test detailed health check when all services are healthy."""
        # Setup mocks
        mock_pc = MagicMock()
        mock_pc.index_stats.return_value = {"dense": {"total_vector_count": 100}}
        mock_pinecone.return_value = mock_pc

        mock_manager = MagicMock()
        mock_manager.get_session_stats.return_value = {"total_sessions": 5}
        mock_session_manager.return_value = mock_manager

        mock_simple_class.return_value = MagicMock()

        response = test_client.get("/api/metrics/health-detailed")

        assert response.status_code == 200
        data = response.json()
        assert data["overall_status"] == "healthy"
        assert "components" in data
        assert data["components"]["pinecone"]["status"] == "healthy"
        assert data["components"]["sessions"]["status"] == "healthy"
        assert data["components"]["rag_simple"]["status"] == "healthy"

    @patch("app.api.metrics.get_session_manager")
    @patch("app.api.metrics.get_pinecone_client")
    @patch("app.api.metrics.SimpleRAG")
    def test_detailed_health_component_failure(
        self,
        mock_simple_class,
        mock_pinecone,
        mock_session_manager,
        test_client: TestClient,
    ):
        """Test detailed health check when a component fails."""
        # Pinecone fails
        mock_pinecone.side_effect = Exception("Pinecone connection failed")

        # Sessions OK
        mock_manager = MagicMock()
        mock_manager.get_session_stats.return_value = {"total_sessions": 5}
        mock_session_manager.return_value = mock_manager

        # RAG OK
        mock_simple_class.return_value = MagicMock()

        response = test_client.get("/api/metrics/health-detailed")

        assert response.status_code == 200
        data = response.json()
        assert data["overall_status"] == "degraded"
        assert data["components"]["pinecone"]["status"] == "unhealthy"
        assert "error" in data["components"]["pinecone"]


@pytest.mark.integration
@pytest.mark.slow
class TestMetricsIntegration:
    """Integration tests for metrics endpoints."""

    def test_compare_modes_real_pipeline(self, test_client: TestClient):
        """
        Integration test with real RAG pipelines.
        Requires indexed documents.
        """
        pytest.skip("Integration test - requires indexed documents")

        response = test_client.get(
            "/api/metrics/compare", params={"query": "What is machine learning?"}
        )

        assert response.status_code == 200
        data = response.json()
        assert all(v["success"] for v in data["results"].values())
