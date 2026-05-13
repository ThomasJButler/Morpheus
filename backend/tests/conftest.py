"""
Test configuration and fixtures.
Provides shared fixtures for all tests including test client, mock data, and utilities.
"""

import os
import tempfile
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def test_client() -> Generator[TestClient, None, None]:
    """
    Create a test client for the FastAPI application.

    Yields:
        TestClient: FastAPI test client
    """
    with TestClient(app) as client:
        yield client


@pytest.fixture
def sample_text_file() -> Generator[str, None, None]:
    """
    Create a temporary text file for testing uploads.

    Yields:
        str: Path to temporary file
    """
    content = """
    This is a test document for RAG system testing.
    It contains multiple paragraphs of text that will be chunked.

    The system should be able to process this document,
    extract meaningful information, and create embeddings.

    Testing is crucial for ensuring the RAG pipeline works correctly.
    """

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write(content)
        temp_path = f.name

    yield temp_path

    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def sample_markdown_file() -> Generator[str, None, None]:
    """
    Create a temporary markdown file for testing uploads.

    Yields:
        str: Path to temporary file
    """
    content = """# Test Document

## Introduction
This is a **test** markdown document.

## Features
- Feature 1: Document processing
- Feature 2: Embedding generation
- Feature 3: Vector search

## Conclusion
This document tests the RAG system's ability to handle markdown.
"""

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        temp_path = f.name

    yield temp_path

    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def mock_openai_embeddings():
    """
    Mock OpenAI embeddings API response.

    Returns:
        MagicMock: Mocked embeddings response
    """
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1] * 512) for _ in range(3)]
    return mock_response


@pytest.fixture
def mock_anthropic_response():
    """
    Mock Anthropic Claude API response.

    Returns:
        MagicMock: Mocked Claude response
    """
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="This is a test response from Claude.")]
    return mock_response


@pytest.fixture
def mock_pinecone_index():
    """
    Mock Pinecone index for testing without actual API calls.

    Returns:
        MagicMock: Mocked Pinecone index
    """
    mock_index = MagicMock()
    mock_index.describe_index_stats.return_value = MagicMock(
        total_vector_count=10, dimension=512
    )
    mock_index.query.return_value = {
        "matches": [
            {
                "id": "test_1",
                "score": 0.95,
                "metadata": {"text": "This is test context.", "source": "test.txt"},
            }
        ]
    }
    mock_index.upsert.return_value = {"upserted_count": 5}
    mock_index.delete.return_value = {}

    return mock_index


@pytest.fixture
def sample_chat_message() -> dict:
    """
    Sample chat message for testing.

    Returns:
        dict: Chat message payload
    """
    return {
        "message": "What is the main topic of the document?",
        "mode": "simple",
        "stream": False,
        "session_id": "test-session-123",
    }


@pytest.fixture
def sample_chunks() -> list[dict]:
    """
    Sample document chunks for testing.

    Returns:
        list[dict]: List of document chunks
    """
    return [
        {
            "text": "This is the first chunk of text.",
            "source": "test.txt",
            "chunk_index": 0,
        },
        {
            "text": "This is the second chunk of text.",
            "source": "test.txt",
            "chunk_index": 1,
        },
        {
            "text": "This is the third chunk of text.",
            "source": "test.txt",
            "chunk_index": 2,
        },
    ]


@pytest.fixture(autouse=True)
def reset_singleton():
    """
    Reset singleton instances between tests to ensure isolation.
    """
    # Reset Pinecone client singleton
    from app.core.pinecone_client import PineconeClient

    PineconeClient._instance = None
    PineconeClient._pc = None
    PineconeClient._index = None
    PineconeClient._sparse_index = None

    yield

    # Cleanup after test
    PineconeClient._instance = None
    PineconeClient._pc = None
    PineconeClient._index = None
    PineconeClient._sparse_index = None


# Mark all tests as asyncio
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "asyncio: mark test as requiring asyncio")
    config.addinivalue_line(
        "markers",
        "integration: mark test as integration test (requires external services)",
    )
    config.addinivalue_line("markers", "slow: mark test as slow running")
