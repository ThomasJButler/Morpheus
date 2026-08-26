# Changelog

All notable changes to Morpheus will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Considered, not promised
- A real Ollama tool-calling loop for deep mode, only if it passes an evaluation on a 9B-class model
- An optional local reranker
- A `bge-m3` preset for multilingual libraries

## [2.0.0] - 2026-08-26

The local rebuild. The 1.0 line described a private system and ran on three cloud services;
2.0 runs entirely on the user's machine and ships the tests that prove it. The full story,
with 28 findings against 1.0 and the commit that resolved each, is in `SECURITY_REVIEW.md`.

### Added
- Ollama for embeddings (`nomic-embed-text`) and generation (`qwen3.5:9b` default, any installed model selectable)
- LanceDB embedded store on disk with hybrid retrieval (vector + BM25, reciprocal rank fusion); deletion compacts old versions so removed text leaves the disk
- Inline citation validation: `[n]` markers are checked against retrieved chunks while streaming, unknown markers are dropped before the client sees them, and every answer carries a grounded flag
- A refusal path that never calls the model when nothing clears the retrieval floor
- Documents inside a guarded, escaped block with a policy that outranks the persona
- Deep mode: model-drafted sub-questions, retrieved separately and fused
- Request body cap at the ASGI layer, per-IP rate limiting, temp files removed in `finally`, page and character caps on parsing
- `tests/test_no_egress.py`, `scripts/prove_local.sh` (kernel sandbox plus `lsof` sampling), a CI job that runs the suite in a network namespace with only loopback, a Playwright test that fails on any non-localhost request, and a static guard against cloud SDKs returning
- `SECURITY_REVIEW.md`, `THREAT_MODEL.md`, `docs/audit/`

### Changed
- The frontend talks to the local backend over SSE; the citation panel and Sources tab now receive data (in 1.0 the citation list never reached the browser)
- Settings: model picker from installed Ollama models, retrieval mode, deep toggle; no providers, no keys
- Fonts are local; a Content-Security-Policy limits `connect-src` to the local backend
- Documents persist as a library in `backend/data/` until deleted; no browser sessions
- Docker Compose publishes ports on `127.0.0.1` only and uses Ollama on the host

### Removed
- Anthropic, OpenAI and Pinecone clients and every dependency that came with them (the whole langchain tree, pinecone-text, NLTK)
- The Next.js BFF route and the key-validation relay
- The Vercel and Render deployments, `render.yaml`, `railway.toml`, `vercel.json`
- Agentic mode, auto routing, HyDE, reflection, reranker: none was reachable from the UI in 1.0
- Codecov uploads and API secrets in CI

### Security
- Second-pass review of the rebuilt code (`docs/audit/06-second-pass.md`): replacing a document now compacts the store so the old text leaves the disk; store writes are serialised; a DOCX declaring more than 200 MB uncompressed is refused before it inflates; Ollama's error text stays in the log; production builds get a CSP without `unsafe-eval`; answers never render images.
- 43 known dependency vulnerabilities in the 1.0 tree; 0 in the 2.0 tree (`pip-audit`)
- The 1.0 changelog's "CSP headers" and "input validation on all endpoints" claims were not true of 1.0; both are true of 2.0

## [1.0.0] - 2025-11-23

### Added

#### Backend
- **Three RAG Modes**: Simple, Cascading (Hybrid), and Agentic
- **Agentic Orchestration**: Claude with tool use for autonomous search strategy
- **Cascading Retrieval**: Dense + sparse retrieval with cross-encoder reranking (48% improvement)
- **Query Rewriting**: Intelligent query enhancement with Claude
- **Streaming Responses**: Real-time SSE streaming to frontend
- **Document Processing**: PDF, TXT, Markdown support with chunking
- **Comprehensive Testing**: 87% code coverage with pytest
- **Production Deployment**: Docker, Railway, Render configurations

#### Frontend
- **Matrix-Themed UI**: Glass morphism design with Matrix rain animation
- **Real-Time Streaming**: SSE client with smooth UI updates
- **Mode Selector**: Switch between RAG modes dynamically
- **Citation Display**: Source highlighting with relevance scores
- **Error Boundaries**: Graceful error handling with Matrix theme
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Comprehensive Testing**: 79% coverage with Jest + Playwright E2E
- **Responsive Design**: Mobile-optimized layouts

#### DevOps
- **CI/CD Pipelines**: GitHub Actions for backend, frontend, deployment, security
- **Automated Testing**: Run tests on every PR
- **Code Coverage**: Codecov integration
- **Security Scanning**: CodeQL weekly scans
- **Docker Support**: Multi-stage builds for production

#### Documentation
- **README**: Comprehensive project overview
- **DEPLOYMENT**: Step-by-step deployment guide
- **IMPLEMENTATION_SUMMARY**: Backend architecture details
- **TESTING**: Complete testing documentation
- **CONTRIBUTING**: Contribution guidelines
- **CODE_OF_CONDUCT**: Community standards

### Performance
- **Retrieval Accuracy**: 91% recall@10 with cascading retrieval (+48% vs semantic-only)
- **Response Latency**:
  - Simple mode: ~500ms
  - Cascading mode: ~600ms
  - Agentic mode: ~1200ms
- **Streaming**: First token in <500ms
- **Uptime**: 98.7% in first month

### Security
- Input validation on all endpoints
- CORS configuration
- CSP headers
- Secret management via environment variables
- No hardcoded credentials
- CodeQL security scanning

## [0.2.0] - 2025-11-15 (Development)

### Added
- Initial cascading retrieval implementation
- Basic agentic mode with Claude
- Frontend Matrix theme
- Docker Compose for local development

### Changed
- Migrated from LangChain to custom orchestration
- Improved embedding strategy
- Enhanced UI with glass morphism

### Fixed
- Streaming disconnect issues
- Memory leaks in vector search
- React hydration warnings

## [0.1.0] - 2025-11-01 (Alpha)

### Added
- Initial prototype with simple semantic search
- Basic FastAPI backend
- Next.js frontend
- Pinecone integration
- OpenAI embeddings

---

## Release Notes Guidelines

### Types of Changes
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes

### Version Numbering
Given a version number MAJOR.MINOR.PATCH:
- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

---

[Unreleased]: https://github.com/ThomasJButler/Morpheus/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/ThomasJButler/Morpheus/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ThomasJButler/Morpheus/releases/tag/v1.0.0
[0.2.0]: https://github.com/ThomasJButler/Morpheus/releases/tag/v0.2.0
[0.1.0]: https://github.com/ThomasJButler/Morpheus/releases/tag/v0.1.0
