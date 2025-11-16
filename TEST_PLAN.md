# Morpheus RAG System - Comprehensive Test Plan

## 📋 Overview

This document provides a complete guide for testing the Morpheus RAG Chatbot API. The test suite covers all API endpoints with unit tests, integration tests, and end-to-end workflows.

---

## 🎯 Test Coverage Summary

| Module | File | Tests | Coverage |
|--------|------|-------|----------|
| **Documents API** | `test_documents.py` | 12 tests | Upload, stats, deletion |
| **Chat API** | `test_chat.py` | 14 tests | All RAG modes, streaming |
| **Metrics API** | `test_metrics.py` | 13 tests | Performance, comparison |
| **Main App** | `test_main.py` | 13 tests | Root, CORS, lifecycle |
| **Fixtures** | `conftest.py` | N/A | Shared test utilities |

**Total: 52 tests** covering all major functionality

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure you're in the backend directory
cd backend

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# OR
.venv\Scripts\activate     # Windows

# Verify pytest is installed
pytest --version
```

### Run All Tests

```bash
# Run all tests with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html

# Run with detailed output
pytest -vv -s
```

---

## 📊 Test Execution Guide

### 1. Run Tests by Module

```bash
# Test document endpoints only
pytest tests/test_documents.py -v

# Test chat endpoints only
pytest tests/test_chat.py -v

# Test metrics endpoints only
pytest tests/test_metrics.py -v

# Test main app endpoints only
pytest tests/test_main.py -v
```

### 2. Run Tests by Category

```bash
# Run only unit tests (exclude integration)
pytest -v -m "not integration"

# Run only integration tests (requires API keys)
pytest -v -m "integration"

# Run only fast tests (exclude slow)
pytest -v -m "not slow"
```

### 3. Run Specific Test Classes

```bash
# Test document upload functionality
pytest tests/test_documents.py::TestDocumentUpload -v

# Test chat endpoint
pytest tests/test_chat.py::TestChatEndpoint -v

# Test metrics comparison
pytest tests/test_metrics.py::TestCompareEndpoint -v

# Test root endpoint
pytest tests/test_main.py::TestRootEndpoint -v
```

### 4. Run Individual Tests

```bash
# Test specific upload scenario
pytest tests/test_documents.py::TestDocumentUpload::test_upload_text_file_success -v

# Test health check
pytest tests/test_chat.py::TestHealthEndpoint::test_health_check_healthy -v

# Test performance benchmark
pytest tests/test_metrics.py::TestPerformanceEndpoint::test_performance_benchmark -v
```

---

## 🧪 Test Types Explained

### Unit Tests (Default)
- **What**: Tests individual functions/endpoints with mocked dependencies
- **When**: Run on every commit
- **Speed**: Fast (< 5 seconds total)
- **Requirements**: None (all external services mocked)

```bash
pytest -v -m "not integration"
```

### Integration Tests
- **What**: Tests with real external services (Pinecone, OpenAI, Anthropic)
- **When**: Run before deployment
- **Speed**: Slow (30-60 seconds)
- **Requirements**: Valid API keys, indexed documents

```bash
# Set environment variables
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export PINECONE_API_KEY="your-key"

# Run integration tests
pytest -v -m "integration"
```

### Slow Tests
- **What**: Performance benchmarks, load tests
- **When**: Run periodically for optimization
- **Speed**: Very slow (minutes)

```bash
pytest -v -m "slow"
```

---

## 📝 Test Scenarios

### Document Upload Tests

```bash
# Test successful uploads
pytest tests/test_documents.py::TestDocumentUpload::test_upload_text_file_success -v
pytest tests/test_documents.py::TestDocumentUpload::test_upload_markdown_file_success -v

# Test error handling
pytest tests/test_documents.py::TestDocumentUpload::test_upload_unsupported_file_type -v
pytest tests/test_documents.py::TestDocumentUpload::test_upload_no_file -v

# Test stats and deletion
pytest tests/test_documents.py::TestDocumentStats -v
pytest tests/test_documents.py::TestDeleteDocuments -v
```

**Expected Results:**
- ✅ Valid files upload successfully with chunks created
- ✅ Unsupported file types return 400 error
- ✅ Stats return accurate document counts
- ✅ Deletion removes all vectors

### Chat Endpoint Tests

```bash
# Test different RAG modes
pytest tests/test_chat.py::TestChatEndpoint::test_chat_simple_mode_no_stream -v
pytest tests/test_chat.py::TestChatEndpoint::test_chat_hybrid_mode_no_stream -v
pytest tests/test_chat.py::TestChatEndpoint::test_chat_agentic_mode_no_stream -v

# Test streaming
pytest tests/test_chat.py::TestChatEndpoint::test_chat_streaming_mode -v

# Test validation
pytest tests/test_chat.py::TestChatEndpoint::test_chat_empty_message -v

# Test health and modes
pytest tests/test_chat.py::TestHealthEndpoint -v
pytest tests/test_chat.py::TestModesEndpoint -v
```

**Expected Results:**
- ✅ Each RAG mode returns appropriate responses
- ✅ Streaming mode returns event-stream
- ✅ Empty messages return 400 error
- ✅ Health check returns service status
- ✅ Modes endpoint lists all available modes

### Metrics Tests

```bash
# Test RAG comparison
pytest tests/test_metrics.py::TestCompareEndpoint -v

# Test session management
pytest tests/test_metrics.py::TestSessionMetrics -v

# Test performance benchmarking
pytest tests/test_metrics.py::TestPerformanceEndpoint -v

# Test detailed health
pytest tests/test_metrics.py::TestHealthDetailed -v
```

**Expected Results:**
- ✅ Comparison runs all modes and returns metrics
- ✅ Session stats show active/expired counts
- ✅ Performance benchmark calculates averages
- ✅ Detailed health shows component status

### Main App Tests

```bash
# Test root endpoint
pytest tests/test_main.py::TestRootEndpoint -v

# Test CORS
pytest tests/test_main.py::TestCORSConfiguration -v

# Test error handling
pytest tests/test_main.py::TestErrorHandling -v

# Test API documentation
pytest tests/test_main.py::TestOpenAPIDocumentation -v
```

**Expected Results:**
- ✅ Root returns API information
- ✅ CORS headers present for allowed origins
- ✅ 404/405 errors handled correctly
- ✅ OpenAPI documentation accessible

---

## 📈 Coverage Reports

### Generate Coverage Report

```bash
# Generate HTML coverage report
pytest --cov=app --cov-report=html --cov-report=term

# Open in browser (macOS)
open htmlcov/index.html

# Open in browser (Linux)
xdg-open htmlcov/index.html
```

### Coverage Targets

| Component | Target | Current |
|-----------|--------|---------|
| Documents API | 90%+ | TBD |
| Chat API | 85%+ | TBD |
| Metrics API | 80%+ | TBD |
| Main App | 75%+ | TBD |
| **Overall** | **85%+** | **TBD** |

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Import Errors

```bash
# Error: ModuleNotFoundError: No module named 'app'
# Solution: Ensure you're in the backend directory
cd backend
pytest -v
```

#### 2. Fixture Not Found

```bash
# Error: fixture 'test_client' not found
# Solution: Ensure conftest.py is in tests directory
ls tests/conftest.py
```

#### 3. Mock Not Working

```bash
# Error: Mock objects not being called
# Solution: Check patch paths match actual import paths
# Example: @patch("app.api.documents.get_pinecone_client")
```

#### 4. Async Tests Failing

```bash
# Error: RuntimeWarning: coroutine was never awaited
# Solution: Use AsyncMock for async functions
from unittest.mock import AsyncMock
mock_func = AsyncMock(return_value=result)
```

#### 5. Pinecone Connection During Tests

```bash
# Error: Real Pinecone calls happening during unit tests
# Solution: Ensure reset_singleton fixture is working
# Check tests/conftest.py for autouse fixture
```

---

## 🎯 Test Execution Strategies

### During Development

```bash
# Run tests related to your changes
pytest tests/test_documents.py -v -k "upload"

# Watch mode (requires pytest-watch)
ptw tests/test_documents.py
```

### Before Committing

```bash
# Run all unit tests (fast)
pytest -v -m "not integration"

# Check code quality
ruff check app/
black --check app/
mypy app/
```

### Before Deployment

```bash
# Run full test suite including integration
pytest -v --cov=app

# Run performance benchmarks
pytest -v -m "slow"

# Generate coverage report
pytest --cov=app --cov-report=html
```

### CI/CD Pipeline

```bash
# .github/workflows/test.yml example
- name: Run Unit Tests
  run: pytest -v -m "not integration" --cov=app

- name: Run Integration Tests
  run: pytest -v -m "integration"
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
```

---

## 📚 Test Data & Fixtures

### Available Fixtures

| Fixture | Type | Description |
|---------|------|-------------|
| `test_client` | TestClient | FastAPI test client |
| `sample_text_file` | str | Temporary .txt file path |
| `sample_markdown_file` | str | Temporary .md file path |
| `mock_openai_embeddings` | Mock | Mocked OpenAI response |
| `mock_anthropic_response` | Mock | Mocked Claude response |
| `mock_pinecone_index` | Mock | Mocked Pinecone index |
| `sample_chat_message` | dict | Sample chat request |
| `sample_chunks` | list | Sample document chunks |
| `reset_singleton` | None | Resets singletons (autouse) |

### Using Fixtures

```python
def test_example(test_client: TestClient, sample_text_file: str):
    """Example test using fixtures."""
    with open(sample_text_file, "rb") as f:
        response = test_client.post(
            "/api/documents/upload",
            files={"file": ("test.txt", f, "text/plain")}
        )
    assert response.status_code == 200
```

---

## 🔍 Debugging Tests

### Run with Debug Output

```bash
# Show print statements
pytest -v -s tests/test_documents.py

# Show full diff on failures
pytest -vv tests/test_chat.py

# Stop on first failure
pytest -x tests/
```

### Use Python Debugger

```python
# Add breakpoint in test
def test_example(test_client):
    response = test_client.get("/")
    breakpoint()  # Execution will pause here
    assert response.status_code == 200
```

```bash
# Run with debugger
pytest -v --pdb tests/test_main.py
```

### View Test Output

```bash
# Show captured logs
pytest -v --log-cli-level=INFO

# Show test durations
pytest -v --durations=10

# Generate JUnit XML report
pytest -v --junitxml=test-results.xml
```

---

## ✅ Pre-Deployment Checklist

- [ ] All unit tests pass (`pytest -v -m "not integration"`)
- [ ] All integration tests pass (`pytest -v -m "integration"`)
- [ ] Code coverage ≥ 85% (`pytest --cov=app`)
- [ ] No security vulnerabilities (`ruff check app/`)
- [ ] Code formatted (`black app/`)
- [ ] Type checks pass (`mypy app/`)
- [ ] API documentation up to date
- [ ] Performance benchmarks acceptable
- [ ] No failing slow tests

---

## 📞 Support

### Common Commands Reference

```bash
# Quick test run
pytest -v

# With coverage
pytest --cov=app --cov-report=term

# Only failures
pytest --lf

# Specific test
pytest tests/test_documents.py::TestDocumentUpload::test_upload_text_file_success

# Debug mode
pytest -v -s --pdb

# Parallel execution (requires pytest-xdist)
pytest -n auto
```

### Resources

- **Pytest Docs**: https://docs.pytest.org/
- **FastAPI Testing**: https://fastapi.tiangolo.com/tutorial/testing/
- **Coverage.py**: https://coverage.readthedocs.io/

---

## 🎉 Success Criteria

Your test suite is healthy when:

✅ All tests pass consistently
✅ Coverage is ≥ 85%
✅ Tests run in < 10 seconds (unit tests only)
✅ No flaky tests (inconsistent pass/fail)
✅ Integration tests work with real services
✅ CI/CD pipeline passes

---

**Happy Testing! 🚀**

*Last Updated: 2025-11-08*
