# CLAUDE.md - Morpheus Project Instructions

This file provides comprehensive guidance to Claude Code when working with the Morpheus project.

## Project Overview

**Morpheus - Agentic RAG System that Reveals Knowledge**

> *"Just like Morpheus revealed the truth about The Matrix, this AI reveals knowledge from your documents."*

Morpheus is a production-grade Retrieval-Augmented Generation system that thinks before it searches. Using agentic reasoning with Claude, cascading retrieval (hybrid dense-sparse search), and intelligent query rewriting, it achieves 48% better retrieval performance than traditional semantic search. Built with FastAPI, Next.js 15, and Pinecone, wrapped in a stunning Matrix-inspired interface.

Unlike basic RAG implementations, Morpheus uses **agentic intelligence** where Claude autonomously decides when to search, what to search for, and how to synthesize results. Combined with **cascading retrieval** (hybrid vectors + cross-encoder reranking), it delivers production-ready AI engineering.

### Key Differentiators
- **Agentic RAG**: Claude acts as an intelligent agent, deciding when and what to search
- **Cascading Retrieval**: Hybrid search combining dense and sparse retrieval (48% performance improvement)
- **Query Intelligence**: Automatic query rewriting and enhancement
- **Visual Excellence**: Matrix-themed UI with glass morphism and smooth animations
- **Production Ready**: Fully tested, documented, and deployed

## Tech Stack

### Backend (Python)
- **Framework**: FastAPI (async, high-performance)
- **LLM**: Anthropic Claude (claude-3-opus/sonnet)
- **Embeddings**: OpenAI text-embedding-3-large (1536 dimensions)
- **Vector DB**: Pinecone (serverless, hybrid search support)
- **Orchestration**: LangChain + LangGraph (complex workflows)
- **Reranking**: Pinecone Reranker (bge-reranker-v2-m3)
- **Runtime**: Python 3.11+

### Frontend (Next.js)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.6 (strict mode)
- **Styling**: Tailwind CSS (Matrix theme)
- **UI Components**: Custom with glass morphism
- **State Management**: React hooks + Context API
- **Streaming**: Server-Sent Events (SSE)
- **Animations**: CSS-based (no external libraries)

### Infrastructure
- **Frontend Hosting**: Vercel (optimized for Next.js)
- **Backend Hosting**: Railway/Render (Python support)
- **Vector Database**: Pinecone Cloud
- **Monitoring**: Built-in metrics dashboard
- **CI/CD**: GitHub Actions

## Architecture

### System Design
```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│            Next.js 15 + TypeScript               │
│         Matrix Theme + Glass Morphism            │
└────────────────┬────────────────────────────────┘
                 │ REST API + SSE
┌────────────────▼────────────────────────────────┐
│                   Backend                        │
│              Python + FastAPI                    │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │          RAG Pipeline Modes              │   │
│  ├──────────────────────────────────────────┤   │
│  │  1. Simple Semantic Search               │   │
│  │  2. Cascading Retrieval (Hybrid)         │   │
│  │  3. Agentic RAG (Tool Use)               │   │
│  │  4. Query Rewriting                      │   │
│  └──────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│              External Services                   │
│   Pinecone | OpenAI | Anthropic | Reranker      │
└──────────────────────────────────────────────────┘
```

### RAG Pipeline Details

#### 1. Document Processing
```python
Pipeline:
  1. Extract → Parse documents (PDF, TXT, MD, Web)
  2. Chunk → RecursiveCharacterTextSplitter(chunk_size=1000, overlap=200)
  3. Embed → OpenAI text-embedding-3-large
  4. Index → Pinecone (dense + sparse vectors)
  5. Metadata → Store source, page, timestamp
```

#### 2. Query Processing Modes

**Simple Semantic Search**
- Direct embedding → vector search → top-k results

**Cascading Retrieval (Hybrid)**
- Dense retrieval (semantic)
- Sparse retrieval (BM25)
- Merge + deduplicate
- Rerank with cross-encoder
- 48% better than single method

**Agentic RAG**
- Claude analyzes query
- Decides search strategy
- May rewrite query
- Performs multiple searches
- Synthesizes final answer

#### 3. Response Generation
- Context injection between markers
- Streaming with citations
- Confidence scoring
- Source highlighting

## File Structure

```
Morpheus/
├── CLAUDE.md                    # This file
├── .claude/                     # giCC system
│   ├── agents/                  # Custom agents
│   ├── commands/                # Workflow automation
│   ├── templates/               # Code style & context
│   └── hooks/                   # Automation
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI application
│   │   ├── api/
│   │   │   ├── chat.py         # Chat endpoints
│   │   │   ├── documents.py    # Document processing
│   │   │   └── metrics.py      # Performance metrics
│   │   ├── core/
│   │   │   ├── config.py       # Configuration
│   │   │   ├── pinecone_client.py
│   │   │   └── dependencies.py
│   │   ├── rag/
│   │   │   ├── agentic.py      # Agentic RAG implementation
│   │   │   ├── cascading.py    # Hybrid search
│   │   │   ├── simple.py       # Basic semantic search
│   │   │   ├── reranker.py     # Reranking logic
│   │   │   ├── embeddings.py   # Embedding generation
│   │   │   └── query_rewriter.py
│   │   ├── models/
│   │   │   ├── chat.py         # Pydantic models
│   │   │   └── documents.py
│   │   └── utils/
│   │       ├── chunking.py     # Text splitting
│   │       └── streaming.py    # SSE utilities
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Main chat interface
│   │   │   ├── layout.tsx      # Matrix theme layout
│   │   │   └── api/            # BFF if needed
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── InputBar.tsx
│   │   │   │   └── ModeSelector.tsx
│   │   │   ├── Context/
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   ├── RetrievalMetrics.tsx
│   │   │   │   └── CitationHighlight.tsx
│   │   │   └── UI/
│   │   │       ├── MatrixRain.tsx
│   │   │       ├── GlassPanel.tsx
│   │   │       └── LoadingPulse.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts   # Backend communication
│   │   │   ├── streaming.ts    # SSE handling
│   │   │   └── types.ts
│   │   └── styles/
│   │       └── matrix-theme.css
│   ├── public/
│   ├── package.json
│   └── tailwind.config.ts      # Matrix colors
└── reference/                   # Documentation & notebooks
    └── notebooks/               # Pinecone RAG examples
```

## Coding Standards

### Python (Backend)

```python
# Function signatures with type hints
async def process_query(
    query: str,
    mode: RAGMode = RAGMode.HYBRID,
    user_id: Optional[str] = None
) -> ChatResponse:
    """
    Process user query through selected RAG pipeline.

    Args:
        query: User input text
        mode: RAG processing mode
        user_id: Optional user identifier for session

    Returns:
        ChatResponse with answer and metadata
    """
    # Implementation
```

**Patterns:**
- Always use type hints
- Async/await for I/O operations
- Pydantic for data validation
- Comprehensive docstrings
- Error handling with custom exceptions
- Logging at appropriate levels

### TypeScript (Frontend)

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  confidence?: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  messages,
  isLoading
}) => {
  // Component logic
};
```

**Patterns:**
- Strict TypeScript mode
- Interface-first design
- Functional components with hooks
- Proper error boundaries
- Accessible markup (ARIA)
- Performance optimization (memo, useCallback)

## API Endpoints

### Core Endpoints

```python
POST /api/chat
Body: {
  "message": "string",
  "mode": "simple" | "hybrid" | "agentic",
  "session_id": "string (optional)",
  "stream": "boolean (default: true)"
}
Response: Stream<ChatResponse> or ChatResponse

POST /api/documents/upload
Body: FormData with file
Response: {
  "document_id": "string",
  "chunks_created": "number",
  "status": "success"
}

GET /api/search/context?query=string&mode=string
Response: {
  "contexts": Context[],
  "scores": number[],
  "rerank_changes": number
}

GET /api/metrics/comparison?query=string
Response: {
  "simple": MetricResult,
  "hybrid": MetricResult,
  "agentic": MetricResult
}
```

## Environment Variables

### Backend (.env)
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=morpheus

# Optional
RERANKER_MODEL=bge-reranker-v2-m3
MAX_CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K_RESULTS=10
MIN_RELEVANCE_SCORE=0.7
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_MATRIX_RAIN=true
NEXT_PUBLIC_STREAM_TIMEOUT=30000
```

## Development Commands

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Development on :3000
npm run build  # Production build
npm run test  # Run tests
```

### Testing
```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
npm run test:e2e  # Playwright E2E
```

## Design System (Matrix Theme)

### Color Palette
```css
--matrix-black: #0a0a0a;      /* Deep black background */
--matrix-green: #00ff00;      /* Classic matrix green */
--matrix-green-dim: #00cc00;  /* Dimmed green */
--matrix-cyan: #00ffff;       /* Cyan accent */
--matrix-white: #e0e0e0;      /* Off-white text */
--glass-bg: rgba(0, 255, 0, 0.03);  /* Glass panels */
--glass-border: rgba(0, 255, 0, 0.2);
```

### Typography
```css
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-sans: 'Inter', system-ui, sans-serif;
```

### Components
- Glass morphism panels with subtle blur
- Matrix rain background (subtle, performance-optimized)
- Terminal-style input with blinking cursor
- Smooth fade-in animations for messages
- Green glow effects on hover/focus

## Performance Targets

- **Query Response**: < 2 seconds (simple), < 3 seconds (agentic)
- **Document Processing**: 100 pages in < 60 seconds
- **Streaming Start**: < 500ms
- **Frontend Lighthouse**: > 90 all categories
- **Concurrent Users**: 100+ supported
- **Uptime**: 99.9% availability

## Working with the Codebase

### Adding New RAG Modes
1. Create new module in `backend/app/rag/`
2. Implement `BaseRAGPipeline` interface
3. Register in `RAGModeRegistry`
4. Add frontend UI option
5. Update API documentation

### Modifying the UI Theme
1. Edit `frontend/tailwind.config.ts`
2. Update CSS variables in `matrix-theme.css`
3. Maintain accessibility (WCAG AA minimum)
4. Test all color contrast ratios

### Optimizing Performance
1. Profile with Python cProfile
2. Use React DevTools Profiler
3. Monitor Pinecone query times
4. Implement caching strategically
5. Optimize chunk sizes based on metrics

## Important Notes

- **Always maintain type safety** in both Python and TypeScript
- **Follow the Matrix theme strictly** - no deviation from color scheme
- **Test RAG modes side-by-side** before deploying changes
- **Document API changes** in OpenAPI spec
- **Keep security in mind** - validate all inputs, sanitize outputs
- **Optimize for streaming** - users expect fast initial response
- **Preserve conversation context** across turns
- **Citation accuracy is critical** - always verify sources

## Quick Reference

### Common Tasks
```bash
# Reindex documents
python scripts/reindex.py

# Clear Pinecone index
python scripts/clear_index.py

# Run performance comparison
python scripts/compare_modes.py --query "test query"

# Generate API docs
python scripts/generate_openapi.py > openapi.json
```

### Debugging
- Backend logs: `backend/logs/app.log`
- Check Pinecone dashboard for index stats
- Use Chrome DevTools for SSE debugging
- Monitor memory usage in production

---

*This CLAUDE.md is maintained by the giCC system and should be the single source of truth for project development.*