# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Morpheus** is a production-grade Retrieval-Augmented Generation (RAG) system featuring:
- **Backend**: Python FastAPI with agentic RAG pipeline (4 modes: simple, cascading/hybrid, agentic, query-rewriting)
- **Frontend**: Next.js 15 with TypeScript, Matrix-themed UI, real-time streaming via SSE
- **Vector DB**: Pinecone for semantic search and multi-tenant document storage
- **Performance**: 48% better retrieval accuracy vs baseline (91% vs 62%)
- **Key Technologies**: Claude 3.5 Sonnet, OpenAI embeddings, LangChain, Tailwind CSS

Full project overview and features in [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Development Commands

### Frontend (Next.js 15)

```bash
# Development
cd frontend && npm run dev              # Start dev server (port 3000)

# Building & Production
npm run build                           # Production build
npm run start                           # Start production server

# Testing
npm run test                            # Watch mode
npm run test:ci                         # CI mode with coverage (target: 70%)
npm run test:e2e                        # Playwright end-to-end tests
npm run test:e2e:ui                     # E2E with Playwright UI
npm run test:e2e:debug                  # E2E debug mode
npm run test:all                        # Run all tests

# Linting & Quality
npm run lint                            # ESLint check
```

**Test Framework**: Jest + React Testing Library + Playwright
**TypeScript**: Strict mode enabled
**Linting**: ESLint

### Backend (FastAPI + Python 3.11+)

```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env      # Configure API keys

# Development
uvicorn app.main:app --reload --port 8000    # Auto-reload on code changes
# API docs: http://localhost:8000/docs (Swagger)

# Testing
pytest tests/ -v                        # All tests
pytest tests/ -v -m unit                # Unit tests (mocked)
pytest tests/ -v -m integration         # Integration tests (requires API keys)
pytest tests/test_file.py -v            # Single file
pytest tests/ -v --cov=app              # With coverage report

# Code Quality
black app/ tests/                        # Format code
ruff check app/ tests/                   # Lint
mypy app/                                # Type checking
```

**Test Markers**: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.slow`

### Docker & All Services

```bash
docker-compose up                       # Start all services locally
docker-compose up -d                    # Start in background
docker-compose down                     # Stop
docker-compose up --build               # Rebuild and start
docker-compose logs -f                  # View logs
docker-compose exec backend bash        # Access container shells
docker-compose exec frontend sh
```

Access locally:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Architecture & Codebase Structure

### Frontend Architecture (`/frontend/src/`)

```
src/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Root layout + global styles
│   ├── page.tsx                 # Main chat interface
│   ├── globals.css              # Tailwind + custom CSS
│   └── api/
│       ├── chat/route.ts        # BFF endpoint for chat streaming
│       └── test-connection/     # Health check
│
├── components/
│   ├── Chat/                    # Chat interface
│   │   ├── ChatInterface.tsx    # Main container
│   │   ├── MessageList.tsx      # Message history (with ARIA live regions)
│   │   ├── ChatMessage.tsx      # Individual messages
│   │   ├── InputBar.tsx         # Terminal-style input
│   │   └── ModeSelector.tsx     # RAG mode picker
│   ├── Context/
│   │   ├── CitationHighlight.tsx   # Highlight source chunks
│   │   ├── DocumentViewer.tsx      # Retrieved docs display
│   │   └── RetrievalMetrics.tsx    # Performance stats
│   ├── UI/                      # Reusable components
│   │   ├── MatrixRain.tsx       # Animated background effect
│   │   ├── GlassPanel.tsx       # Glass morphism containers
│   │   ├── LoadingPulse.tsx     # Loading animations
│   │   ├── Button.tsx, ConfirmDialog.tsx, InfoTooltip.tsx
│   ├── Documents/               # Document management UI
│   ├── Settings/                # User preferences
│   ├── Onboarding/              # First-time UX
│   ├── ErrorBoundary.tsx        # Error handling
│   └── ErrorFallback.tsx        # Error UI
│
└── lib/
    ├── api-client.ts            # Backend API client
    ├── types.ts                 # TypeScript interfaces
    └── hooks/
        └── useChat.ts           # Chat state management
```

**Key Patterns**:
- App Router with file-based routing
- Server components where possible
- React hooks for state management
- Async API calls via BFF pattern
- TypeScript strict mode throughout
- Tailwind CSS (Matrix theme: black #0a0a0a, green #00ff00, cyan #00ffff)
- Custom animations: matrix-rain, glow-pulse, fade-in, slide-up
- ARIA attributes for accessibility

### Backend Architecture (`/backend/app/`)

```
app/
├── main.py                      # FastAPI app + lifespan events
│
├── api/                         # Route handlers
│   ├── chat.py                 # POST /api/chat (main endpoint, SSE)
│   ├── documents.py            # Document upload/management
│   └── metrics.py              # Performance analytics
│
├── core/
│   ├── config.py               # Settings (Pydantic, env vars)
│   ├── pinecone_client.py      # Vector DB client initialization
│   └── morpheus_prompts.py     # System prompts for Claude
│
├── rag/                        # RAG implementation (4 modes)
│   ├── simple.py               # Direct semantic search
│   ├── reranker.py             # Cross-encoder reranking (bge-reranker-v2-m3)
│   ├── hybrid.py               # Dense + sparse (BM25) retrieval
│   └── agentic.py              # Claude tool use for search strategy
│
├── models/
│   └── chat.py                 # Pydantic schemas: ChatRequest, ChatResponse
│
└── utils/
    ├── chunking.py             # Document chunking (1000 tokens, 200 overlap)
    ├── document_processor.py    # PDF/DOCX/Markdown parsing
    └── session.py              # User session + namespace isolation
```

**Key Patterns**:
- FastAPI with async handlers
- Dependency injection via `Depends()`
- Pydantic for data validation
- SSE for streaming responses
- Lifespan context manager for startup/shutdown
- CORS configured for localhost:3000
- Error handling with HTTPException
- Session-based multi-tenancy (Pinecone namespaces)

### RAG Pipeline (4 Modes)

1. **Simple** - Direct embedding + semantic search (fast baseline)
2. **Cascading/Hybrid** - Dense + sparse + reranking (48% better accuracy)
3. **Agentic** - Claude uses tools to orchestrate search strategy (most intelligent)
4. **Query Rewriting** - Automatic query enhancement before search

**Key Components**:
- **Embeddings**: OpenAI text-embedding-3-large (1536 dimensions)
- **Vector Search**: Pinecone (cloud-managed)
- **Reranking**: bge-reranker-v2-m3 cross-encoder
- **LLM**: Claude 3.5 Sonnet (via Anthropic SDK)
- **Chunking**: 1000 tokens per chunk, 200 token overlap

### Testing Structure

**Frontend**: `/frontend/__tests__/`
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright
- Coverage target: 70%

**Backend**: `/backend/tests/`
- Unit tests: Mocked dependencies
- Integration tests: Requires API keys
- pytest markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.slow`
- Coverage target: 80%

---

## Key Configuration Files

### Frontend
| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript strict mode (`"strict": true`) |
| `next.config.js` | Rewrites `/api/*` to FastAPI backend |
| `jest.config.js` | Test setup, 70% coverage threshold |
| `tailwind.config.ts` | Matrix color scheme + animations |
| `playwright.config.ts` | E2E test browser/device config |

### Backend
| File | Purpose |
|------|---------|
| `pytest.ini` | Test discovery, markers (unit/integration/slow) |
| `requirements.txt` | Python dependencies |
| `railway.toml` | Railway deployment config |
| `render.yaml` | Render deployment config |

### Root
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local dev environment (frontend 3000, backend 8000) |

---

## Environment Variables

### Backend (.env)
```
# APIs
ANTHROPIC_API_KEY              # Claude API key
OPENAI_API_KEY                 # OpenAI embeddings
PINECONE_API_KEY               # Vector DB
PINECONE_INDEX_NAME=morpheus   # Index name
PINECONE_DIMENSION=1536        # Embedding dimension

# Models
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
EMBEDDING_MODEL=text-embedding-3-large
TOP_K_RESULTS=10               # Retrieval result count

# Server
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_MATRIX_RAIN=true
NEXT_PUBLIC_STREAM_TIMEOUT=30000
NEXT_PUBLIC_ENABLE_METRICS=true
NEXT_PUBLIC_DEBUG=false
```

---

## Important Development Patterns

### Frontend
- **Streaming Chat**: Use Next.js API route BFF pattern with SSE
- **State Management**: `useChat` custom hook for chat state
- **TypeScript**: Always use interfaces/types, strict mode enabled
- **Accessibility**: Add ARIA attributes (live regions for message list)
- **Styling**: Tailwind utility classes, custom animations in globals.css
- **Error Handling**: ErrorBoundary + ErrorFallback components

### Backend
- **Async Everywhere**: Use `async def` for I/O operations
- **Pydantic Validation**: All request/response models inherit from BaseModel
- **Error Handling**: Raise `HTTPException` for HTTP errors, global exception handler for others
- **Logging**: Use Python logging module
- **Type Hints**: Full type annotations expected (mypy enforced)
- **Multi-Tenancy**: Use session IDs to isolate user namespaces in Pinecone

---

## Common Workflows

### Adding a New Chat Mode (Backend)

1. Create new RAG implementation in `/backend/app/rag/`
2. Implement interface compatible with existing modes
3. Add mode selector in `api/chat.py`
4. Update `ModeSelector.tsx` frontend component
5. Test with `pytest tests/test_chat.py -v`

### Adding a Frontend Component

1. Create component in appropriate `/components/` subdirectory
2. Define props interface with TypeScript
3. Add unit tests in `__tests__/`
4. Use Tailwind CSS, no inline styles
5. Run `npm run lint` and `npm run test` before committing

### Debugging RAG Pipeline

- Check retrieved chunks: API response includes `context` array with `source` and `similarity_score`
- Verify embeddings: Test with OpenAI API directly
- Check Pinecone index: Use Pinecone console to query vector store
- Monitor reranking: Log cross-encoder scores in reranker.py
- Use API docs: http://localhost:8000/docs for interactive testing

### Performance Benchmarks

- Frontend Lighthouse: Target 90+
- Backend response time: Target <2s for streaming response
- Retrieval accuracy: Morpheus cascading achieves 91% (vs 62% baseline)
- Context relevance: 94% (vs 71% baseline)

---

## Code Quality Standards

- **Type Safety**: TypeScript strict mode + MyPy type checking
- **Formatting**: Black (Python) + Prettier (JS/TS)
- **Linting**: Ruff (Python) + ESLint (JS/TS)
- **Tests**: 70% frontend coverage, 80% backend coverage
- **Documentation**: Docstrings for functions, comments for complex logic
- **Git**: Feature branches, descriptive commit messages (see CONTRIBUTING.md)

---

## Deployment

For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

Quick reference:
- **Backend**: Railway.app or Render (configured in railway.toml / render.yaml)
- **Frontend**: Vercel (optimized for Next.js)
- **Database**: Pinecone (cloud-managed)
- **CI/CD**: GitHub Actions (see .github/workflows/)

---

## Additional Resources

- **[README.md](README.md)** - Project overview, features, benchmarks
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide for all platforms
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - PR process, code standards, commit conventions
- **[TESTING.md](backend/TESTING.md)** - Backend testing strategy and examples
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
