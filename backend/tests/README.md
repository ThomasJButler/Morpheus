# Morpheus RAG System - Test Suite

## Quick Start

```bash
# Run all tests
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific module
pytest tests/test_documents.py -v
```

## Test Files

| File | Purpose | Tests |
|------|---------|-------|
| `conftest.py` | Shared fixtures and configuration | N/A |
| `test_documents.py` | Document upload & processing | 12 |
| `test_chat.py` | Chat endpoint & RAG modes | 14 |
| `test_metrics.py` | Performance & monitoring | 13 |
| `test_main.py` | Main app & lifecycle | 13 |

**Total: 52 tests**

## Test Categories

### Unit Tests (Default)
```bash
pytest -v -m "not integration"
```
- Fast (< 5 seconds)
- All external services mocked
- Run on every commit

### Integration Tests
```bash
pytest -v -m "integration"
```
- Requires API keys
- Tests with real services
- Run before deployment

### Slow Tests
```bash
pytest -v -m "slow"
```
- Performance benchmarks
- Run periodically

## Coverage

Generate coverage report:
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

Target: **85%+ coverage**

## Fixtures Available

- `test_client` - FastAPI test client
- `sample_text_file` - Temporary .txt file
- `sample_markdown_file` - Temporary .md file
- `mock_openai_embeddings` - Mocked OpenAI response
- `mock_anthropic_response` - Mocked Claude response
- `mock_pinecone_index` - Mocked Pinecone index
- `sample_chat_message` - Sample chat request
- `sample_chunks` - Sample document chunks

## Example Test

```python
def test_upload_document(test_client: TestClient, sample_text_file: str):
    """Test document upload."""
    with open(sample_text_file, "rb") as f:
        response = test_client.post(
            "/api/documents/upload",
            files={"file": ("test.txt", f, "text/plain")}
        )
    assert response.status_code == 200
    assert response.json()["success"] is True
```

## Full Documentation

See **[TEST_PLAN.md](../../TEST_PLAN.md)** for complete testing guide.

---

✅ **All tests pass** | 📊 **85%+ coverage** | ⚡ **< 10s runtime**
