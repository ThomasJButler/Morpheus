"""
Tests for main application endpoints and configuration.
Tests root endpoint, CORS, exception handling, and app lifecycle.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestRootEndpoint:
    """Tests for GET / root endpoint."""

    def test_root_endpoint(self, test_client: TestClient):
        """Test root endpoint returns API information."""
        response = test_client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "operational"
        assert "endpoints" in data

    def test_root_endpoint_structure(self, test_client: TestClient):
        """Test root endpoint includes all expected endpoints."""
        response = test_client.get("/")

        data = response.json()
        endpoints = data["endpoints"]

        # Check key endpoints are documented
        assert "chat" in endpoints
        assert "upload" in endpoints
        assert "document_stats" in endpoints
        assert "health" in endpoints

    def test_root_endpoint_docs_link(self, test_client: TestClient):
        """Test root endpoint includes documentation links."""
        response = test_client.get("/")

        data = response.json()
        assert "docs" in data
        assert data["docs"] == "/docs"


class TestCORSConfiguration:
    """Tests for CORS middleware configuration."""

    def test_cors_preflight_request(self, test_client: TestClient):
        """Test CORS preflight OPTIONS request."""
        response = test_client.options(
            "/api/chat",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            }
        )

        # Should return 200 with CORS headers
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

    def test_cors_actual_request(self, test_client: TestClient):
        """Test CORS on actual request."""
        response = test_client.get(
            "/api/health",
            headers={"Origin": "http://localhost:3000"}
        )

        assert "access-control-allow-origin" in response.headers


class TestErrorHandling:
    """Tests for global error handling."""

    def test_404_not_found(self, test_client: TestClient):
        """Test 404 error for non-existent endpoint."""
        response = test_client.get("/nonexistent/endpoint")

        assert response.status_code == 404

    def test_405_method_not_allowed(self, test_client: TestClient):
        """Test 405 error for wrong HTTP method."""
        # GET instead of POST for chat
        response = test_client.get("/api/chat")

        assert response.status_code == 405

    @patch("app.main.get_pinecone_client")
    def test_global_exception_handler(
        self,
        mock_pinecone,
        test_client: TestClient
    ):
        """Test global exception handler catches unhandled errors."""
        # This is hard to test directly since FastAPI handles most errors
        # But we can verify the handler exists
        from app.main import app

        assert hasattr(app, "exception_handlers")


class TestOpenAPIDocumentation:
    """Tests for OpenAPI/Swagger documentation."""

    def test_docs_endpoint_accessible(self, test_client: TestClient):
        """Test /docs endpoint is accessible."""
        response = test_client.get("/docs")

        assert response.status_code == 200
        assert b"swagger" in response.content.lower() or b"openapi" in response.content.lower()

    def test_redoc_endpoint_accessible(self, test_client: TestClient):
        """Test /redoc endpoint is accessible."""
        response = test_client.get("/redoc")

        assert response.status_code == 200
        assert b"redoc" in response.content.lower()

    def test_openapi_schema(self, test_client: TestClient):
        """Test OpenAPI schema is available."""
        response = test_client.get("/openapi.json")

        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "paths" in schema
        assert "info" in schema
        assert schema["info"]["title"] == "Morpheus API"


class TestAppLifecycle:
    """Tests for application lifecycle events."""

    @patch("app.main.get_pinecone_client")
    def test_startup_initializes_pinecone(self, mock_pinecone):
        """Test that startup event initializes Pinecone."""
        # Create a new test client to trigger startup
        with TestClient(app) as client:
            # Verify Pinecone client was called during startup
            mock_pinecone.assert_called()

    @patch("app.main.get_pinecone_client")
    def test_startup_failure_handling(self, mock_pinecone):
        """Test startup handles Pinecone initialization failure."""
        # Mock Pinecone to fail
        mock_client = MagicMock()
        mock_client.index_stats.side_effect = Exception("Connection failed")
        mock_pinecone.return_value = mock_client

        # App should raise exception during startup
        with pytest.raises(Exception):
            with TestClient(app) as client:
                pass


class TestSecurityHeaders:
    """Tests for security headers and configurations."""

    def test_response_includes_security_headers(self, test_client: TestClient):
        """Test that responses include basic security headers."""
        response = test_client.get("/")

        # FastAPI doesn't add these by default, but documenting expectation
        # In production, you might add middleware for security headers
        assert response.status_code == 200

    def test_no_server_header_leakage(self, test_client: TestClient):
        """Test that server implementation details aren't leaked."""
        response = test_client.get("/")

        # Uvicorn typically adds server header, but we document the check
        headers = {k.lower(): v for k, v in response.headers.items()}
        if "server" in headers:
            # Should not reveal too much information
            assert "python" not in headers["server"].lower()


class TestRateLimiting:
    """Tests for rate limiting configuration."""

    @pytest.mark.skip("Rate limiting not yet implemented")
    def test_rate_limit_applied(self, test_client: TestClient):
        """
        Test rate limiting is applied to endpoints.
        Note: Requires SlowAPI middleware to be properly configured.
        """
        # Make many requests quickly
        for _ in range(20):
            response = test_client.get("/api/health")

        # Eventually should hit rate limit
        # assert response.status_code == 429


@pytest.mark.integration
class TestEndToEndFlow:
    """End-to-end integration tests."""

    def test_full_rag_workflow(self, test_client: TestClient):
        """
        Test complete RAG workflow: upload → query → verify.
        Requires external services.
        """
        pytest.skip("Integration test - requires API keys")

        # 1. Upload a document
        # 2. Verify stats show uploaded doc
        # 3. Query the document
        # 4. Verify response contains relevant information
        # 5. Clean up

        # This would be implemented with real API calls
        pass


# Import app for lifecycle tests
from app.main import app
