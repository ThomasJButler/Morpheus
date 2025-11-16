# Testing Guide - RAG Chatbot Backend

Comprehensive testing strategy for the RAG Chatbot backend, covering unit tests, integration tests, E2E tests, and performance benchmarking.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Unit Tests](#unit-tests)
5. [Integration Tests](#integration-tests)
6. [E2E Tests](#e2e-tests)
7. [Performance Testing](#performance-testing)
8. [Test Data](#test-data)
9. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

**Test Pyramid Approach:**
- **Unit Tests (70%)**: Fast, isolated tests of individual functions and classes
- **Integration Tests (20%)**: Tests of component interactions (RAG pipelines, API endpoints)
- **E2E Tests (10%)**: Full workflow tests from API to response

**Key Principles:**
- Tests must be fast (< 5 seconds for unit, < 30 seconds for integration)
- Tests must be deterministic and repeatable
- Mock external services (Pinecone, OpenAI, Anthropic) in unit/integration tests
- Use real services only in E2E tests (with test indexes)
- Maintain >80% code coverage

---

## Test Structure

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Pytest fixtures and configuration
│   ├── unit/                    # Unit tests
│   │   ├── test_chunking.py
│   │   ├── test_document_processor.py
│   │   ├── test_reranker.py
│   │   ├── test_query_rewriter.py
│   │   └── test_session.py
│   ├── integration/             # Integration tests
│   │   ├── test_rag_simple.py
│   │   ├── test_rag_hybrid.py
│   │   ├── test_rag_agentic.py
│   │   └── test_api_endpoints.py
│   ├── e2e/                     # End-to-end tests
│   │   ├── test_full_workflow.py
│   │   └── test_streaming.py
│   ├── performance/             # Performance benchmarks
│   │   └── test_benchmarks.py
│   └── fixtures/                # Test data
│       ├── sample_documents/
│       └── sample_queries.json
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Run specific test category
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/

# Run specific test file
pytest tests/unit/test_chunking.py

# Run specific test
pytest tests/unit/test_chunking.py::test_chunk_documents

# Run with verbose output
pytest -v

# Run with output capture disabled (see print statements)
pytest -s

# Run in parallel (faster)
pytest -n auto
```

### Test Markers

```bash
# Run only fast tests
pytest -m fast

# Run only slow tests
pytest -m slow

# Skip E2E tests
pytest -m "not e2e"

# Run only tests that use real services
pytest -m real_services
```

---

## Unit Tests

### Document Processing Tests

**File**: `tests/unit/test_document_processor.py`

```python
"""Unit tests for document processing."""

import pytest
from pathlib import Path
from app.utils.document_processor import DocumentProcessor


@pytest.fixture
def processor():
    """Create document processor instance."""
    return DocumentProcessor()


def test_validate_file_size_within_limit(processor, tmp_path):
    """Test file size validation for acceptable files."""
    # Create test file
    test_file = tmp_path / "test.txt"
    test_file.write_text("Test content")

    assert processor.validate_file_size(str(test_file)) is True


def test_validate_file_size_exceeds_limit(processor, tmp_path):
    """Test file size validation for oversized files."""
    # Create large test file (>50MB)
    test_file = tmp_path / "large.txt"
    test_file.write_bytes(b"x" * (51 * 1024 * 1024))

    assert processor.validate_file_size(str(test_file)) is False


def test_process_txt_file(processor, tmp_path):
    """Test TXT file processing."""
    test_file = tmp_path / "test.txt"
    test_file.write_text("This is a test document.")

    result = processor.process_file(str(test_file))

    assert result["success"] is True
    assert len(result["content"]) > 0
    assert result["content"][0]["text"] == "This is a test document."


def test_process_unsupported_file_type(processor, tmp_path):
    """Test handling of unsupported file types."""
    test_file = tmp_path / "test.exe"
    test_file.write_bytes(b"binary content")

    with pytest.raises(ValueError, match="Unsupported file type"):
        processor.process_file(str(test_file))


def test_process_pdf_without_pypdf2(processor, tmp_path, monkeypatch):
    """Test PDF processing when PyPDF2 is not installed."""
    test_file = tmp_path / "test.pdf"
    test_file.write_bytes(b"fake pdf content")

    # Mock PyPDF2 as None
    monkeypatch.setattr("app.utils.document_processor.PyPDF2", None)

    with pytest.raises(ImportError, match="PyPDF2 is required"):
        processor._process_pdf(str(test_file))
```

### Chunking Tests

**File**: `tests/unit/test_chunking.py`

```python
"""Unit tests for text chunking."""

import pytest
from app.utils.chunking import DocumentChunker


@pytest.fixture
def chunker():
    """Create chunker instance."""
    return DocumentChunker(chunk_size=100, chunk_overlap=20)


def test_chunk_single_document(chunker):
    """Test chunking a single document."""
    documents = [
        {
            "text": "This is a test document. " * 20,  # Long text
            "source": "test.txt",
        }
    ]

    chunks = chunker.chunk_documents(documents)

    assert len(chunks) > 1  # Should be chunked
    assert all("text" in chunk for chunk in chunks)
    assert all("source" in chunk for chunk in chunks)
    assert all(chunk["source"] == "test.txt" for chunk in chunks)


def test_chunk_preserves_metadata(chunker):
    """Test that chunking preserves document metadata."""
    documents = [
        {
            "text": "Test content " * 50,
            "source": "test.pdf",
            "page": 1,
            "custom_field": "value",
        }
    ]

    chunks = chunker.chunk_documents(documents)

    for chunk in chunks:
        assert chunk["source"] == "test.pdf"
        assert chunk["page"] == 1
        assert "chunk_index" in chunk


def test_chunk_empty_documents(chunker):
    """Test chunking empty document list."""
    chunks = chunker.chunk_documents([])
    assert chunks == []


def test_chunk_size_respected(chunker):
    """Test that chunks respect size limits."""
    documents = [{"text": "word " * 200, "source": "test.txt"}]

    chunks = chunker.chunk_documents(documents)

    for chunk in chunks:
        # Chunks should be roughly within size limit
        assert len(chunk["text"]) <= chunker.chunk_size * 10  # Characters, not tokens
```

### Session Management Tests

**File**: `tests/unit/test_session.py`

```python
"""Unit tests for session management."""

import pytest
from datetime import datetime, timedelta
from app.utils.session import SessionManager
from app.models.chat import RAGMode, Citation


@pytest.fixture
def session_manager():
    """Create session manager with short TTL for testing."""
    return SessionManager(ttl_minutes=1)


def test_create_session(session_manager):
    """Test session creation."""
    session = session_manager.create_session(mode=RAGMode.HYBRID)

    assert session.session_id is not None
    assert session.mode == RAGMode.HYBRID
    assert len(session.messages) == 0
    assert isinstance(session.created_at, datetime)


def test_get_existing_session(session_manager):
    """Test retrieving existing session."""
    session = session_manager.create_session()
    session_id = session.session_id

    retrieved = session_manager.get_session(session_id)

    assert retrieved is not None
    assert retrieved.session_id == session_id


def test_get_nonexistent_session(session_manager):
    """Test retrieving non-existent session."""
    result = session_manager.get_session("nonexistent-id")
    assert result is None


def test_add_message_to_session(session_manager):
    """Test adding messages to session."""
    session = session_manager.create_session()

    updated = session_manager.add_message_to_session(
        session.session_id,
        role="user",
        content="Test message",
    )

    assert updated is not None
    assert len(updated.messages) == 1
    assert updated.messages[0].role == "user"
    assert updated.messages[0].content == "Test message"


def test_session_expiry(session_manager):
    """Test session expiration."""
    session = session_manager.create_session()
    session_id = session.session_id

    # Manually expire session
    session.updated_at = datetime.now() - timedelta(minutes=5)
    session_manager.update_session(session)

    # Attempt to retrieve expired session
    retrieved = session_manager.get_session(session_id)
    assert retrieved is None  # Should be None (expired and deleted)


def test_cleanup_expired_sessions(session_manager):
    """Test cleanup of expired sessions."""
    # Create multiple sessions
    session1 = session_manager.create_session()
    session2 = session_manager.create_session()

    # Expire one session
    session1.updated_at = datetime.now() - timedelta(minutes=5)
    session_manager.update_session(session1)

    # Run cleanup
    session_manager.cleanup_expired_sessions()

    # Check that only expired session was removed
    assert session_manager.get_session(session1.session_id) is None
    assert session_manager.get_session(session2.session_id) is not None
```

---

## Integration Tests

### RAG Pipeline Tests

**File**: `tests/integration/test_rag_hybrid.py`

```python
"""Integration tests for hybrid RAG pipeline."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.rag.hybrid import HybridRAG


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for embeddings."""
    client = AsyncMock()
    client.embeddings.create.return_value = MagicMock(
        data=[MagicMock(embedding=[0.1] * 1536)]
    )
    return client


@pytest.fixture
def mock_pinecone_index():
    """Mock Pinecone index."""
    index = MagicMock()
    index.query.return_value = {
        "matches": [
            MagicMock(
                id="chunk_1",
                score=0.95,
                metadata={
                    "text": "Test content",
                    "source": "test.pdf",
                    "page": 1,
                },
            )
        ]
    }
    return index


@pytest.mark.asyncio
async def test_hybrid_retrieval(mock_openai_client, mock_pinecone_index):
    """Test hybrid retrieval combines dense and sparse results."""
    with patch("app.rag.hybrid.AsyncOpenAI", return_value=mock_openai_client):
        with patch("app.rag.hybrid.get_pinecone_client") as mock_pc:
            mock_pc.return_value.get_both_indexes.return_value = (
                mock_pinecone_index,
                mock_pinecone_index,
            )

            rag = HybridRAG()
            contexts, metrics = await rag.retrieve_hybrid("test query", top_k=5)

            assert len(contexts) > 0
            assert metrics.query_time_ms > 0
            assert metrics.num_results > 0


@pytest.mark.asyncio
async def test_merge_results_deduplicates():
    """Test that merge_results removes duplicates."""
    rag = HybridRAG()

    # Create mock matches with duplicate
    dense_match = MagicMock(
        id="chunk_1",
        score=0.9,
        metadata={"text": "content"},
    )
    sparse_match = MagicMock(
        id="chunk_1",  # Same ID (duplicate)
        score=0.85,
        metadata={"text": "content"},
    )

    merged = rag.merge_results([dense_match], [sparse_match])

    # Should have only one result (deduplicated)
    assert len(merged) == 1
    # Score should be combined
    assert merged[0]["source"] == "both"
```

### API Endpoint Tests

**File**: `tests/integration/test_api_endpoints.py`

```python
"""Integration tests for API endpoints."""

import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "pinecone_connected" in data


@pytest.mark.asyncio
async def test_modes_endpoint():
    """Test RAG modes listing endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/modes")

        assert response.status_code == 200
        data = response.json()
        assert "modes" in data
        assert len(data["modes"]) >= 3  # simple, hybrid, agentic


@pytest.mark.asyncio
async def test_chat_endpoint_validation():
    """Test chat endpoint request validation."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Empty message should fail
        response = await client.post(
            "/api/chat",
            json={"message": "", "mode": "simple", "stream": False},
        )

        assert response.status_code == 400


@pytest.mark.asyncio
async def test_document_upload_validation():
    """Test document upload validation."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Test unsupported file type
        files = {"file": ("test.exe", b"binary content", "application/octet-stream")}
        response = await client.post("/api/documents/upload", files=files)

        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]
```

---

## E2E Tests

### Full Workflow Test

**File**: `tests/e2e/test_full_workflow.py`

```python
"""End-to-end tests for complete workflows."""

import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_complete_rag_workflow():
    """Test complete RAG workflow: upload → query → response."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Step 1: Upload a document
        files = {
            "file": ("test.txt", b"RAG stands for Retrieval-Augmented Generation.", "text/plain")
        }
        upload_response = await client.post("/api/documents/upload", files=files)
        assert upload_response.status_code == 200

        # Step 2: Query the knowledge base
        chat_response = await client.post(
            "/api/chat",
            json={
                "message": "What does RAG stand for?",
                "mode": "simple",
                "stream": False,
            },
        )
        assert chat_response.status_code == 200

        # Step 3: Verify response
        data = chat_response.json()
        assert "message" in data
        assert "Retrieval-Augmented Generation" in data["message"]
        assert len(data["citations"]) > 0
```

---

## Performance Testing

### Benchmark Tests

**File**: `tests/performance/test_benchmarks.py`

```python
"""Performance benchmark tests."""

import pytest
import time
from app.rag.simple import SimpleRAG
from app.rag.hybrid import HybridRAG


@pytest.mark.slow
@pytest.mark.asyncio
async def test_simple_rag_performance():
    """Benchmark simple RAG query time."""
    rag = SimpleRAG()

    start = time.time()
    _, _, metrics = await rag.process_query("What is RAG?")
    elapsed = time.time() - start

    # Should complete within 2 seconds
    assert elapsed < 2.0
    assert metrics.query_time_ms < 2000


@pytest.mark.slow
@pytest.mark.asyncio
async def test_hybrid_rag_performance():
    """Benchmark hybrid RAG query time."""
    rag = HybridRAG()

    start = time.time()
    _, _, metrics = await rag.process_query("Explain hybrid search")
    elapsed = time.time() - start

    # Should complete within 3 seconds
    assert elapsed < 3.0
    assert metrics.query_time_ms < 3000


@pytest.mark.slow
@pytest.mark.asyncio
async def test_concurrent_queries():
    """Test performance under concurrent load."""
    import asyncio

    rag = SimpleRAG()

    async def run_query():
        _, _, metrics = await rag.process_query("Test query")
        return metrics.query_time_ms

    # Run 10 concurrent queries
    results = await asyncio.gather(*[run_query() for _ in range(10)])

    # All should complete successfully
    assert len(results) == 10
    # Average should be reasonable
    avg_time = sum(results) / len(results)
    assert avg_time < 5000  # 5 seconds average
```

---

## Test Data

### Sample Queries

**File**: `tests/fixtures/sample_queries.json`

```json
{
  "simple_queries": [
    "What is RAG?",
    "How does semantic search work?",
    "Explain vector databases"
  ],
  "complex_queries": [
    "Compare dense and sparse retrieval methods and explain when to use each",
    "What are the trade-offs between different embedding models?",
    "How can I implement cascading retrieval with reranking?"
  ],
  "ambiguous_queries": [
    "How does it work?",
    "Tell me more about that",
    "What's the difference?"
  ]
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Backend Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run linting
        run: |
          cd backend
          ruff check .
          black --check .

      - name: Run unit tests
        run: |
          cd backend
          pytest tests/unit/ -v --cov=app --cov-report=xml

      - name: Run integration tests
        run: |
          cd backend
          pytest tests/integration/ -v

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml
```

---

## Best Practices

1. **Mock External Services**: Always mock Pinecone, OpenAI, and Anthropic in unit/integration tests
2. **Use Fixtures**: Leverage pytest fixtures for common setup
3. **Test Edge Cases**: Empty inputs, oversized inputs, malformed data
4. **Async Testing**: Use `@pytest.mark.asyncio` for async functions
5. **Parametrize Tests**: Use `@pytest.mark.parametrize` for multiple test cases
6. **Clean Up**: Ensure tests clean up resources (temp files, sessions)
7. **Test Isolation**: Each test should be independent
8. **Meaningful Assertions**: Assert specific values, not just "truthy"
9. **Document Tests**: Add docstrings explaining what each test validates
10. **Performance Marks**: Mark slow tests with `@pytest.mark.slow`

---

## Quick Reference

```bash
# Development workflow
pytest tests/unit/ -v           # Fast feedback during development
pytest --cov=app                # Check coverage
pytest -k "test_specific"       # Run specific test
pytest -x                       # Stop on first failure
pytest --lf                     # Run last failed tests
pytest --pdb                    # Drop into debugger on failure

# Pre-commit
pytest tests/unit/ tests/integration/

# Pre-push
pytest --cov=app --cov-report=term-missing

# Before deployment
pytest tests/ --slow
```

---

**Project**: RAG Chatbot
**Author**: Tom Butler
**Last Updated**: 2025-11-06
