# Morpheus

> *"Free your mind."*

**An intelligent document reasoning system with a stunning Matrix-themed interface.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://morpheusrag.vercel.app)

---

## What Is This?

Morpheus doesn't just search your documents—it *understands* them. Upload files, ask questions in natural language, and receive accurate answers with full source citations. All wrapped in a beautiful, terminal-inspired Matrix UI.

**Try it now:** [morpheusrag.vercel.app](https://morpheusrag.vercel.app)

---

## Current Features

### 🎯 Intelligent Document Q&A
- Upload PDF, DOCX, TXT, and Markdown files
- Ask questions in natural language
- Get contextually accurate answers
- Full source citations with relevance scores
- Session-based document isolation

### 🎨 Matrix-Themed Interface
A visual experience that matches the technical sophistication:
- Glass morphism design with backdrop blur
- Animated Matrix rain background (toggle on/off)
- Smooth typewriter effects and staggered animations
- Mobile-first responsive design
- Terminal-style interactions with cyan/green accents
- Real-time streaming responses

### ⚡ Production-Ready Engineering
- TypeScript strict mode throughout
- Server-sent events for streaming
- Session-based multi-tenancy
- Keyboard shortcuts (⌘K, ⌘S, Esc)
- Export conversations as JSON
- Performance-optimised animations

---

## The Stack

**Frontend**
- Next.js 15 with App Router
- TypeScript (strict mode)
- Tailwind CSS
- Server-sent events for streaming

**Backend**
- Python 3.11+ with FastAPI
- Claude 3.5 Sonnet for responses
- OpenAI embeddings (text-embedding-3-large)
- Pinecone vector database
- Custom chunking and embedding pipeline
- Session-based namespace isolation

**How It Works**
1. Documents are chunked intelligently (1000 tokens, 200 overlap)
2. Embedded using OpenAI's latest model (1536 dimensions)
3. Stored in Pinecone with session-specific namespaces
4. Retrieved via semantic search when you ask questions
5. Claude synthesises contextually relevant answers
6. Sessions refresh embeddings for optimal performance

---

## What's Next?

The frontend is polished and production-ready. Backend enhancements are in development:

- **Agentic Intelligence**: Claude will reason about *how* to find answers, not just retrieve documents
- **Multiple RAG Modes**: Simple, cascading (hybrid), agentic, and query-rewriting strategies
- **Enhanced Retrieval**: BM25 sparse retrieval + cross-encoder reranking
- **Improved Accuracy**: Targeting 90%+ retrieval accuracy through hybrid approaches

---

## Architecture

```
┌─────────────────────────────────────┐
│   Next.js 15 Frontend (Vercel)     │
│   Matrix UI + Real-time Streaming  │
└──────────────┬──────────────────────┘
               │ REST API + SSE
┌──────────────▼──────────────────────┐
│   FastAPI Backend (Railway/Render)  │
│   Claude 3.5 + RAG Pipeline         │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐         ┌──────▼──────┐
│Pinecone│         │   OpenAI    │
│Vectors │         │  Embeddings │
└────────┘         └─────────────┘
```

---

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Full deployment guide
- **[CLAUDE.md](CLAUDE.md)** - Development instructions for AI assistants
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

---

## Licence

MIT License - see [LICENSE](LICENSE) for details

---

## Links

- **Live Demo**: [morpheusrag.vercel.app](https://morpheusrag.vercel.app)
- **API Docs**: [Backend Swagger](https://morpheus-backend-4c0h.onrender.com/docs)
- **GitHub**: [ThomasJButler/Morpheus](https://github.com/ThomasJButler/Morpheus)

---

*"I can only show you the door. You're the one that has to walk through it."*
