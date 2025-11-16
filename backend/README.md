# Morpheus Backend

FastAPI backend for Morpheus with agentic reasoning, cascading retrieval, and streaming support.

## Quick Start

### 1. Set up environment

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API keys:
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY
# - PINECONE_API_KEY
```

### 3. Run the server

```bash
# Development mode (with auto-reload)
uvicorn app.main:app --reload --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

## API Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Available Endpoints

### Chat
- `POST /api/chat` - Send a message and get a response (streaming or non-streaming)

### Health & Info
- `GET /api/health` - Health check and Pinecone connection status
- `GET /api/modes` - List available RAG modes
- `GET /` - API information

## RAG Modes

All modes are fully implemented:

- **Simple**: Basic semantic search with direct retrieval
- **Hybrid**: Dense + sparse retrieval with cross-encoder reranking (48% performance improvement)
- **Agentic**: Claude-powered intelligent search strategy with autonomous decision-making
- **Query Rewriting**: Automatic query enhancement and expansion

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI application entry point
│   ├── api/
│   │   ├── chat.py                # Chat endpoints
│   │   ├── documents.py           # Document processing endpoints
│   │   └── metrics.py             # Performance metrics endpoints
│   ├── core/
│   │   ├── config.py              # Configuration management
│   │   └── pinecone_client.py     # Vector database client
│   ├── models/
│   │   └── chat.py                # Pydantic models
│   ├── rag/
│   │   ├── simple.py              # Simple semantic search
│   │   ├── hybrid.py              # Cascading retrieval (dense + sparse)
│   │   ├── agentic.py             # Agentic RAG with tool use
│   │   ├── reranker.py            # Cross-encoder reranking
│   │   └── query_rewriter.py      # Query enhancement
│   └── utils/
│       ├── chunking.py            # Document chunking
│       ├── document_processor.py   # Document processing
│       └── session.py             # Session management
├── tests/                         # Test files
├── requirements.txt               # Python dependencies
├── IMPLEMENTATION_SUMMARY.md      # Implementation details
├── TESTING.md                     # Testing documentation
└── .env.example                   # Environment template
```

## Development

### Running tests
```bash
pytest tests/ -v
```

### Code formatting
```bash
black app/
ruff check app/
```

### Type checking
```bash
mypy app/
```

## Environment Variables

See [.env.example](.env.example) for all configuration options.

Key variables:
- `ANTHROPIC_API_KEY` - Claude API key (required)
- `OPENAI_API_KEY` - OpenAI API key for embeddings (required)
- `PINECONE_API_KEY` - Pinecone API key (required)
- `PINECONE_INDEX_NAME` - Name of your Pinecone index
- `TOP_K_RESULTS` - Number of results to retrieve (default: 10)

## Next Steps

1. Configure your `.env` file with API keys
2. Test the health endpoint: `curl http://localhost:8000/api/health`
3. Try a chat request (see API docs for examples)
4. Compare different RAG modes using the metrics endpoint
5. Upload documents and test retrieval quality

## Troubleshooting

**Port already in use:**
```bash
# Change the port
uvicorn app.main:app --reload --port 8001
```

**Import errors:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
# Reinstall dependencies
pip install -r requirements.txt
```

**Pinecone connection errors:**
- Check your API key in `.env`
- Verify index exists in Pinecone dashboard
- Check index dimension matches embedding model (1536 for text-embedding-3-large)
