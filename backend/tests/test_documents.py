"""
Tests for document upload and processing endpoints.
Tests /api/documents/* endpoints including upload, stats, and deletion.
"""

from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestDocumentUpload:
    """Tests for POST /api/documents/upload endpoint."""

    @patch("app.api.documents.get_pinecone_client")
    @patch("app.api.documents.openai_client")
    def test_upload_text_file_success(
        self,
        mock_openai,
        mock_pinecone,
        test_client: TestClient,
        sample_text_file: str,
        mock_openai_embeddings,
        mock_pinecone_index,
    ):
        """Test successful text file upload."""
        # Setup mocks
        mock_openai.embeddings.create = AsyncMock(return_value=mock_openai_embeddings)
        mock_pinecone.return_value.get_both_indexes.return_value = (
            mock_pinecone_index,
            None,
        )

        # Upload file
        with open(sample_text_file, "rb") as f:
            response = test_client.post(
                "/api/documents/upload", files={"file": ("test.txt", f, "text/plain")}
            )

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["file_type"] == "txt"
        assert data["chunks_created"] > 0
        assert data["vectors_indexed"] > 0

    @patch("app.api.documents.get_pinecone_client")
    @patch("app.api.documents.openai_client")
    def test_upload_markdown_file_success(
        self,
        mock_openai,
        mock_pinecone,
        test_client: TestClient,
        sample_markdown_file: str,
        mock_openai_embeddings,
        mock_pinecone_index,
    ):
        """Test successful markdown file upload."""
        # Setup mocks
        mock_openai.embeddings.create = AsyncMock(return_value=mock_openai_embeddings)
        mock_pinecone.return_value.get_both_indexes.return_value = (
            mock_pinecone_index,
            None,
        )

        # Upload file
        with open(sample_markdown_file, "rb") as f:
            response = test_client.post(
                "/api/documents/upload", files={"file": ("test.md", f, "text/markdown")}
            )

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["file_type"] == "md"

    def test_upload_unsupported_file_type(self, test_client: TestClient):
        """Test upload with unsupported file type."""
        # Create fake file with unsupported extension
        fake_file = BytesIO(b"fake content")

        response = test_client.post(
            "/api/documents/upload",
            files={"file": ("test.xyz", fake_file, "application/octet-stream")},
        )

        # Should return 400 Bad Request
        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]

    def test_upload_no_file(self, test_client: TestClient):
        """Test upload without providing a file."""
        response = test_client.post("/api/documents/upload")

        # Should return 422 Unprocessable Entity
        assert response.status_code == 422

    @patch("app.api.documents.get_pinecone_client")
    @patch("app.api.documents.openai_client")
    def test_upload_with_processing_error(
        self, mock_openai, mock_pinecone, test_client: TestClient, sample_text_file: str
    ):
        """Test upload when processing fails."""
        # Mock processing to fail
        with patch("app.api.documents.document_processor.process_file") as mock_process:
            mock_process.return_value = {"success": False, "error": "Processing failed"}

            with open(sample_text_file, "rb") as f:
                response = test_client.post(
                    "/api/documents/upload",
                    files={"file": ("test.txt", f, "text/plain")},
                )

            # Should return 422
            assert response.status_code == 422
            assert "Processing failed" in response.json()["detail"]


class TestDocumentStats:
    """Tests for GET /api/documents/stats endpoint."""

    @patch("app.api.documents.get_pinecone_client")
    def test_get_stats_success(
        self, mock_pinecone, test_client: TestClient, mock_pinecone_index
    ):
        """Test successful retrieval of document stats."""
        # Setup mock
        mock_client = MagicMock()
        mock_client.index_stats.return_value = {
            "dense": {"total_vector_count": 42, "dimension": 512}
        }
        mock_pinecone.return_value = mock_client

        response = test_client.get("/api/documents/stats")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "stats" in data

    @patch("app.api.documents.get_pinecone_client")
    def test_get_stats_error(self, mock_pinecone, test_client: TestClient):
        """Test stats retrieval when Pinecone fails."""
        # Mock to raise exception
        mock_pinecone.return_value.index_stats.side_effect = Exception(
            "Connection error"
        )

        response = test_client.get("/api/documents/stats")

        assert response.status_code == 500
        assert "Error" in response.json()["detail"]


class TestDeleteDocuments:
    """Tests for DELETE /api/documents/all endpoint."""

    @patch("app.api.documents.get_pinecone_client")
    def test_delete_all_success(self, mock_pinecone, test_client: TestClient):
        """Test successful deletion of all documents."""
        # Setup mock
        mock_client = MagicMock()
        mock_client.delete_all_vectors.return_value = True
        mock_pinecone.return_value = mock_client

        response = test_client.delete("/api/documents/all")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"].lower()

    @patch("app.api.documents.get_pinecone_client")
    def test_delete_all_failure(self, mock_pinecone, test_client: TestClient):
        """Test deletion failure."""
        # Setup mock to return failure
        mock_client = MagicMock()
        mock_client.delete_all_vectors.return_value = False
        mock_pinecone.return_value = mock_client

        response = test_client.delete("/api/documents/all")

        assert response.status_code == 500
        assert "failed" in response.json()["detail"].lower()

    @patch("app.api.documents.get_pinecone_client")
    def test_delete_all_error(self, mock_pinecone, test_client: TestClient):
        """Test deletion when exception occurs."""
        # Mock to raise exception
        mock_client = MagicMock()
        mock_client.delete_all_vectors.side_effect = Exception("Delete error")
        mock_pinecone.return_value = mock_client

        response = test_client.delete("/api/documents/all")

        assert response.status_code == 500
        assert "Error" in response.json()["detail"]


@pytest.mark.integration
class TestDocumentUploadIntegration:
    """Integration tests requiring actual external services."""

    def test_upload_real_file(self, test_client: TestClient, sample_text_file: str):
        """
        Integration test with real services.
        Skipped by default - requires ANTHROPIC_API_KEY, OPENAI_API_KEY, PINECONE_API_KEY.
        """
        pytest.skip("Integration test - requires API keys")

        with open(sample_text_file, "rb") as f:
            response = test_client.post(
                "/api/documents/upload", files={"file": ("test.txt", f, "text/plain")}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
