# Phase 0: what is actually in this repo

Date 2026-08-26, commit `3397d0b`, branch `feat/localai`. Nothing was changed while this was written.

This is the map: how requests actually flow, what talks to the network, where every key and environment variable is read, which dependencies can open a socket, what code is dead, and the state of the machine it is being developed on. The security consequences are in `SECURITY_REVIEW.md`; this document is the evidence base.

---

## 1. Your description versus what is there

| You said | What the code does |
|---|---|
| Python, FastAPI backend | Yes. FastAPI 0.115.0, uvicorn, pydantic-settings. `backend/app/` is 6,250 lines across `api/`, `core/`, `rag/`, `utils/`, `models/`. CI tests on 3.11 and 3.12. |
| Pinecone for the vector store | Yes, dense index only. The "sparse index" methods in `core/pinecone_client.py:88-107` return `None` with a warning. "Hybrid" mode (`rag/hybrid.py`) fetches 2k dense results and re-scores them with an in-memory BM25 written by hand. |
| Anthropic and/or OpenAI for embeddings and generation | Yes, but split across two processes and only one generation path is live. Embeddings: OpenAI `text-embedding-3-large` (backend, `config.py:43`). Generation on the live path: the **Next.js server** calls Anthropic or OpenAI via the Vercel AI SDK with a key from the user's browser. Generation in the FastAPI `/api/chat` endpoint (Anthropic SDK, three modes) exists but the shipped UI never calls it. |
| Some kind of frontend on Vercel | Next.js 15.5 / React 19 app on Vercel at `morpheusrag.vercel.app`; backend on Render at `morpheus-backend-4c0h.onrender.com`; `vercel.json:15` hardcodes that URL. `DEPLOYMENT.md` recommends Railway and `render.yaml`/`railway.toml` both exist. |

Not in your description, and true: the frontend has its own second backend (Next.js route handlers) which is where the model is actually called.

---

## 2. Request flows as built

### 2.1 Chat, the live path

```
Browser (ChatInterface.tsx, useChat from 'ai/react')
  POST /api/chat  (same origin, Vercel function)
  body: { messages, provider, anthropicApiKey, anthropicModel, openaiApiKey, openaiModel, ragMode, deepMode }
  header: X-Session-ID
        │
        ▼
Next.js route  frontend/src/app/api/chat/route.ts
  1. pick provider + key (body key, else process.env.ANTHROPIC_API_KEY / OPENAI_API_KEY)
  2. POST {BACKEND_URL}/api/context  { query, mode, deep_mode, return_analysis: true }  header X-Session-ID
        │                                   (Render, FastAPI)
        │                                   chat.py:189-305
        │                                   └─ embed query via OpenAI ─► Pinecone query (namespace = session)
        │                                      returns { context: "<formatted chunk text>", citations: [...], metrics, mode_used, analysis }
        ▼
  3. build user prompt: USER_PROMPT_TEMPLATE.replace('{context}', context).replace('{query}', lastUserMessage)
  4. streamText({ model: anthropic(...) | openai(...), system: MORPHEUS_SYSTEM_PROMPT, messages })  ─► api.anthropic.com / api.openai.com
  5. response headers: X-RAG-Mode, X-RAG-Citations (a COUNT), X-RAG-Analysis (JSON), X-RAG-Metrics (JSON)
        │
        ▼
Browser: tokens render; onResponse parses the three JSON headers; message.citations is never set, so
         ChatMessage's citation panel and SourcesTab receive nothing.
```

Note on step 2: `/api/context` ignores `deep_mode`, and for `mode == "agentic"` it uses `orchestrator.simple_rag` (`chat.py:266-270`). The AGENTIC badge in the UI is driven by `mode_used`, which the endpoint sets to the *requested* mode before downgrading the retrieval (`chat.py:242-256`).

### 2.2 Chat, the dormant FastAPI path

```
POST /api/chat (FastAPI)  chat.py:79-186   ChatRequest { message | messages, rag_mode, deep_mode, stream }
  └─ orchestrator.process_query()  orchestrator.py:47-106
       ├─ AUTO: QueryAnalyzer.analyze() (heuristics only, no model call)  query_analyzer.py:42-75
       ├─ SIMPLE : SimpleRAG   OpenAI embed → Pinecone → Anthropic stream          simple.py
       ├─ HYBRID : HybridRAG   OpenAI embed → Pinecone (2k) → in-memory BM25 → Anthropic stream   hybrid.py
       └─ AGENTIC: AgenticRAG  Anthropic with tools (search_knowledge_base, rewrite_query), up to 5 calls  agentic.py
  SSE events: mode, analysis, citation (before tokens), token, tool_call, done, error
```

Only `process_query` is reachable. The orchestrator's `process_with_auto_escalation`, `process_with_reflection`, `process_with_smart_escalation`, `process_with_hyde` have no callers. The frontend hook that used to call this endpoint (`frontend/src/lib/hooks/useChat.ts`) has no importers.

### 2.3 Upload

```
Browser (DocumentUploader → api-client.ts uploadDocument)  POST {NEXT_PUBLIC_API_URL}/api/documents/upload  (direct to Render, CORS)
  documents.py:34-121
  1. extension allowlist (pdf, txt, md, docx)
  2. content = await file.read()                       ← whole body in memory
  3. NamedTemporaryFile(delete=False).write(content)   ← OS temp dir
  4. size check (50MB)                                  ← after 2 and 3
  5. DocumentProcessor.process_file(temp path)          ← PyPDF2 / python-docx / open()
  6. DocumentChunker (langchain RecursiveCharacterTextSplitter, 1000/200)
  7. index_chunks(): OpenAI embeddings in batches of 100; BM25Encoder.fit() + encode (discarded);
     vectors with metadata {text, source, chunk_index, page}; Pinecone upsert(namespace)
  8. unlink temp file (only reached on success)
```

### 2.4 Session lifecycle

```
Page load → useSession.ts: read morpheus_session_id from localStorage or generate (Math.random UUID)
         → POST {NEXT_PUBLIC_API_URL}/api/documents/cleanup with X-Session-ID   (deletes that namespace's vectors)
"Reset session" → new UUID → cleanup of the NEW (empty) namespace; the old namespace is never touched
Tab close → nothing
```

### 2.5 Health

```
useBackendHealth.ts → GET /api/health (same origin) → next.config.js rewrite → {BACKEND_URL}/api/health
chat.py:340-367 → pinecone describe_index_stats → { status, pinecone_connected, index_stats, rag_modes }
The cold-start UI (ColdStart.tsx) narrates Render spin-up with stage labels including "Connecting Pinecone index".
```

---

## 3. Every network call

### 3.1 Backend, at runtime

| # | Where | Call | Destination | When |
|---|---|---|---|---|
| 1 | `core/pinecone_client.py:42` | `Pinecone(api_key=...)` | api.pinecone.io | import of `main.py` (via `chat.py:26` → orchestrator → SimpleRAG → `get_index`) |
| 2 | `core/pinecone_client.py:61,68,80` | `list_indexes`, `create_index`, `Index` | Pinecone control plane | first `get_index` |
| 3 | `core/pinecone_client.py:122` | `describe_index_stats` | Pinecone data plane | lifespan, `/api/health`, `/health-detailed`, `/stats`, `/cleanup`, `/list` |
| 4 | `core/pinecone_client.py:173,176` | `delete(delete_all=True)` | Pinecone data plane | `/cleanup`, `DELETE /all` |
| 5 | `rag/simple.py:82`, `rag/hybrid.py:199`, `rag/agentic.py:156`, `api/documents.py:276,456` | `index.query` | Pinecone data plane | every query; `/stats` and `/list` (zero vector) |
| 6 | `api/documents.py:232` | `index.upsert` | Pinecone data plane | every upload |
| 7 | `api/documents.py:160`, `rag/simple.py:55`, `rag/hybrid.py:176`, `rag/agentic.py:129`, `rag/query_analyzer.py:478` | `openai.embeddings.create` | api.openai.com | every upload (chunks) and every query |
| 8 | `rag/simple.py:202`, `rag/hybrid.py:445` | `anthropic.messages.stream` | api.anthropic.com | FastAPI `/api/chat` only |
| 9 | `rag/agentic.py:348,447,587` | `messages.stream` x2, `messages.create` (reflection) | api.anthropic.com | FastAPI `/api/chat` agentic only; reflection unreachable |
| 10 | `rag/query_analyzer.py:442,529` | `messages.create` (HyDE, gap detection) | api.anthropic.com | unreachable |
| 11 | `rag/query_rewriter.py:85,138,211,275` | `messages.create` | api.anthropic.com | unreachable |
| 12 | `rag/reranker.py:128` | `pc.inference.rerank` | Pinecone inference | unreachable (and would crash first) |
| 13 | `site-packages/pinecone_text/sparse/bm25_tokenizer.py:39,44` | `nltk.download("punkt")`, `nltk.download("stopwords")` | raw.githubusercontent.com (NLTK data index) | first `BM25Encoder.fit()` if corpora missing |
| 14 | `site-packages/pinecone_text/sparse/bm25_encoder.py:258-261` | `wget.download(...)` | storage.googleapis.com | only via `BM25Encoder.default()`, not called |
| 15 | `langsmith` (transitive of `langchain-core`) | tracing client | api.smith.langchain.com | dormant unless `LANGCHAIN_TRACING_V2` / `LANGSMITH_*` set; never set |
| 16 | `Dockerfile:75`, `docker-compose.yml:32` | `requests.get('http://localhost:8000/api/health')` | loopback | healthcheck |

### 3.2 Backend, at build

| Where | Call | Destination |
|---|---|---|
| `Dockerfile:30-31` | `pip install` | PyPI |
| `Dockerfile:34` | `nltk.download('punkt_tab')` | raw.githubusercontent.com |

### 3.3 Frontend, at runtime

| # | Where | Call | Destination | From |
|---|---|---|---|---|
| 1 | `src/app/api/chat/route.ts:127` | `fetch(${BACKEND_URL}/api/context)` | Render | Vercel function |
| 2 | `src/app/api/chat/route.ts:171` | `streamText` | api.anthropic.com or api.openai.com | Vercel function |
| 3 | `src/app/api/test-connection/route.ts:24` | `fetch('https://api.openai.com/v1/models')` | OpenAI | Vercel function |
| 4 | `src/app/api/test-connection/route.ts:41` | `fetch('https://api.anthropic.com/v1/messages')` | Anthropic | Vercel function |
| 5 | `src/lib/api-client.ts:35,44,74,195,211,220,229,239,249` | `/api/health`, `/api/chat`, `/api/documents/{upload,stats,list,cleanup,all}`, `/api/metrics/performance` | `NEXT_PUBLIC_API_URL` (Render), cross-origin | browser |
| 6 | `src/lib/hooks/useSession.ts:56,91` | `POST /api/documents/cleanup` | `NEXT_PUBLIC_API_URL` | browser |
| 7 | `src/lib/hooks/useBackendHealth.ts:91` | `GET /api/health` | same origin → `next.config.js:22-25` rewrite → `BACKEND_URL` | browser → Vercel → Render |
| 8 | `next.config.js:13-39` | rewrites for `/api/documents/*`, `/api/health`, `/api/metrics/*`, `/api/info` | `BACKEND_URL` | Vercel proxy (only `/api/health` is actually used this way; the client calls Render directly for the rest) |
| 9 | `src/app/globals.css:1` | `@import url('https://fonts.googleapis.com/css2?family=Inter...&family=JetBrains+Mono...')` | Google Fonts, then fonts.gstatic.com | browser, every page load |
| 10 | `src/styles/matrix.css:27` | `@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono...')` | Google Fonts | browser, every page load |

Not egress from the product: `README.md` badge images (shields.io), GitHub links in `page.tsx:149` and `Header.tsx:67`, a react.dev link in `ErrorBoundary.tsx:39`.

### 3.4 Frontend, at build

| Where | Call | Destination |
|---|---|---|
| `src/app/layout.tsx:2,10` | `next/font/google` Inter | fonts.googleapis.com (self-hosted afterwards) |
| `package.json` | `npm install` | npm registry |
| `vercel.json:18-21` | `NEXT_TELEMETRY_DISABLED=1` | (prevents Next.js build telemetry) |

### 3.5 CI

| Where | Destination |
|---|---|
| `backend-test.yml:47-52` | Pinecone, OpenAI, Anthropic via real `*_TEST` secrets during pytest |
| `backend-test.yml:56-60`, `frontend-test.yml:46-50` | Codecov upload |
| `codeql.yml` | GitHub CodeQL (fine) |

---

## 4. Every API key and secret

| Name | Read at | Purpose | Notes |
|---|---|---|---|
| `PINECONE_API_KEY` | `backend/app/core/config.py:27` (required) | vector store | app will not start without it |
| `OPENAI_API_KEY` | `config.py:24` (optional) | embeddings | "optional" in the type, but `AsyncOpenAI(api_key=None)` fails on first call |
| `ANTHROPIC_API_KEY` | `config.py:20` (optional) | generation on the FastAPI path | same |
| `ANTHROPIC_API_KEY` | `frontend/src/app/api/chat/route.ts:97` | server-side fallback for the BFF | see F6 |
| `OPENAI_API_KEY` | `route.ts:84` | server-side fallback for the BFF | not in `frontend/.env.example` |
| `anthropicApiKey`, `openaiApiKey` (browser) | `useSettings.ts:8-18`, stored `localStorage`/`sessionStorage` key `userSettings` | user-supplied keys | sent in every `POST /api/chat` body (`ChatInterface.tsx:91-97`) and to `/api/test-connection` |
| `ANTHROPIC_API_KEY_TEST`, `OPENAI_API_KEY_TEST`, `PINECONE_API_KEY_TEST` | `.github/workflows/backend-test.yml:48-50` | CI | GitHub secrets |
| Codecov token | implicit in `codecov-action@v4` | CI | |

On disk: `backend/.env` exists, is untracked, and contains the `.env.example` placeholders plus a note from Tom. Git history across all refs contains no key-shaped strings.

---

## 5. Every environment variable

### 5.1 Backend (`backend/app/core/config.py`)

| Field | Default | Read by | Notes |
|---|---|---|---|
| `anthropic_api_key` | None | simple, hybrid, agentic, query_analyzer, query_rewriter | |
| `openai_api_key` | None | documents, simple, hybrid, agentic, query_analyzer | |
| `pinecone_api_key` | required | pinecone_client, reranker | |
| `pinecone_environment` | `us-west1-gcp` | pinecone_client (as AWS region!) | `.env.example` says `us-east-1`; the default is a GCP name passed as an AWS region |
| `pinecone_index_name` | `morpheus` | pinecone_client | |
| `pinecone_dimension` | 1536 | pinecone_client `create_index` | must match embedding model; not validated |
| `anthropic_model` | `claude-sonnet-4-6` | all Anthropic callers | `.env.example` says `claude-3-5-haiku-latest` |
| `embedding_model` | `text-embedding-3-large` | all OpenAI callers | dimension 512 forced when name contains "small" |
| `max_chunk_size`, `chunk_overlap` | 1000, 200 | chunking | |
| `top_k_results` | 10 | simple, hybrid | |
| `min_relevance_score` | **0.3** | simple, hybrid | `.env.example` says 0.7 |
| `default_rag_mode` | `auto` | nothing | unused |
| `enable_hybrid_rag`, `enable_agentic_rag` | True | nothing | unused |
| `dense_weight`, `sparse_weight` | 0.7, 0.3 | hybrid | |
| `enable_reranking` | True | nothing | reranker reads `use_reranker`, which does not exist |
| `rerank_top_k` | 5 | reranker (dead) | |
| `agentic_max_tool_calls` | 5 | agentic | |
| `agentic_timeout_seconds` | 30 | agentic (passed, never enforced) | |
| `enable_reflection`, `reflection_min_confidence` | True, 0.6 | orchestrator dead paths | |
| `enable_query_rewriting` | True | nothing | unused |
| `complexity_threshold_low`, `_high` | 0.3, 0.7 | query_analyzer | |
| `supported_file_types` | `pdf,txt,md,docx` | documents, document_processor | |
| `max_file_size_mb` | 50 | document_processor (post-read) | |
| `api_host`, `api_port` | `0.0.0.0`, 8000 | `main.py` `__main__` only | uvicorn CLI in Docker overrides |
| `cors_origins` | localhost:3000 list | main | |
| `log_level`, `log_file` | INFO, `logs/app.log` | main (file handler commented out) | |
| `debug`, `reload` | False | main | |

Keys present in `.env.example` that `Settings` rejects (`extra_forbidden`, confirmed by running the suite): `PINECONE_SPARSE_INDEX_NAME` (line 35), `RERANKER_MODEL` (58), `USE_RERANKER` (106), `USE_HYBRID_SEARCH` (111).

Docker Compose additionally sets `API_HOST`, `API_PORT`, `CORS_ORIGINS` (`docker-compose.yml:20-23`). Railway/Render docs list `RERANKER_MODEL`, `USE_RERANKER`, `USE_HYBRID_SEARCH` as variables to set, which would crash the app on those platforms too.

### 5.2 Frontend

Variables actually read in source (`grep -rho 'process\.env\.[A-Z_]*' frontend/src frontend/next.config.js`):

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `api-client.ts:9`, `useSession.ts:55,90` | browser → backend base URL (Render in prod via `vercel.json:15`) |
| `BACKEND_URL` | `route.ts:17`, `next.config.js:14` | server → backend base URL |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | `route.ts:84,97` | server-side key fallbacks |
| `NEXT_PUBLIC_REDESIGN_V2` | `flags.ts:1` | v2 shell flag |
| `NEXT_PUBLIC_ENABLE_MATRIX_RAIN` | one component | rain effect |
| `NEXT_PUBLIC_APP_VERSION` | one component | display |
| `NODE_ENV` | two places | |

`frontend/.env.example` documents about 35 variables. Everything else in it (GA tracking ID, Sentry DSN, performance monitoring, stream timeouts and retries, service worker, image optimisation, prefetch, reduced motion, high contrast, mock API, dev tools, feature flags for metrics/upload/cascading/context viewer/pill mode) is read by nothing.

---

## 6. Every dependency that can open a socket

### 6.1 Backend (`requirements.txt`, and what is actually installed)

| Package | Used by app code? | Network behaviour |
|---|---|---|
| `anthropic 0.39.0` | yes | api.anthropic.com |
| `openai 1.51.2` | yes | api.openai.com |
| `pinecone-client 5.0.1` (+ `pinecone-plugin-inference`) | yes | api.pinecone.io, `*.svc.pinecone.io`; inference plugin for reranking |
| `pinecone-text 0.9.0` | yes (BM25Encoder, output discarded) | NLTK downloads at first use; `wget` to GCS for `.default()` |
| `nltk 3.10.3` | transitively | downloads corpora on demand |
| `langchain 0.3.3`, `langchain-community 0.3.2`, `langchain-openai 0.2.2`, `langchain-anthropic 0.2.3` | **no** | each can call its provider; community has many network integrations |
| `langchain-core 0.3.63` → `langsmith 0.1.147` | transitively (via text-splitters) | tracing to LangSmith if configured |
| `langchain-text-splitters 0.3.0` | yes (`RecursiveCharacterTextSplitter`) | none itself; drags in core + langsmith |
| `httpx 0.27.2`, `requests 2.34.2`, `aiohttp 3.14.3`, `urllib3` | transitively (SDKs); `requests` only in the Docker healthcheck | generic HTTP |
| `fastapi`, `uvicorn`, `starlette`, `sse-starlette` | yes | listens; no outbound |
| `slowapi 0.1.9` | **no** | none |
| `pypdf2 3.0.1`, `python-docx 1.1.2` | yes | none |
| `beautifulsoup4`, `markdown`, `aiofiles`, `python-json-logger`, `python-dotenv` | **no** | none |
| `numpy <2` | transitively (pinecone-text) | none |

### 6.2 Frontend (`package.json` dependencies)

| Package | Network behaviour |
|---|---|
| `ai ^4`, `@ai-sdk/anthropic ^1`, `@ai-sdk/openai ^1.3` | provider APIs from the Next.js server |
| `next ^15.5.7` | build telemetry (disabled in `vercel.json`), `next/font/google` at build |
| `react`, `react-dom`, `react-markdown`, `clsx`, `tailwind-merge`, `zod`, `geist` | none |

---

## 7. Dead code map

Measured with `wc -l`; "unreachable" means no call path from any registered route.

| Module or region | Lines | Reachable from | Notes |
|---|---|---|---|
| `rag/agentic.py` | 721 | FastAPI `/api/chat` (not called by the UI) | reflection methods (`reflect_on_response`, `process_query_with_reflection`) unreachable even there |
| `rag/query_rewriter.py` | 342 | nothing | four Anthropic calls |
| `rag/reranker.py` | 206 | nothing | would raise on the two missing settings |
| `utils/session.py` | 286 | `/api/metrics/sessions*` only | not connected to namespaces |
| `rag/orchestrator.py:136-602` | 467 | nothing | escalation, reflection, smart escalation, HyDE |
| `rag/query_analyzer.py:418-572` | 154 | nothing | HyDE generation and embedding, gap detection |
| `core/morpheus_prompts.py:53-69` | 17 | nothing | greeting and no-context response |
| `api/metrics.py` | 138 | routes exist; frontend calls a different, nonexistent path (`/api/metrics/performance`) | |
| `frontend/src/lib/hooks/useChat.ts` | 177 | nothing | the pre-BFF chat hook |
| `frontend/src/lib/api-client.ts` `chat()`, `streamChat()`, `getPerformance()` | ~150 | nothing | `streamChat` is the SSE client the migration will reuse |

Total unreachable in `backend/app/`: 2,172 of 6,250 lines (34%), before counting `agentic.py` as effectively dead.

Advertised but unreachable: `GET /api/info` (`chat.py:370-418`) lists "HyDE (Hypothetical Document Embeddings)", "Auto-escalation on low confidence", per-mode latency and "accuracy 70-95%". `CHANGELOG.md:56-62` lists recall and uptime figures. `rag/__init__.py:1-14` and `models/chat.py:14-21` docstrings describe the tiered system as if it were live.

---

## 8. Machine and environment state (2026-08-26)

| Item | State |
|---|---|
| Hardware | Apple M1 Max, 32 GB RAM, arm64, macOS Darwin 25.5 |
| Ollama | 0.32.6 at `/usr/local/bin/ollama`, server responding on `127.0.0.1:11434`, models installed: `qwen3.5:0.8b` only |
| `backend/.venv` | Python 3.13.7 **x86_64** (Intel Homebrew under Rosetta). `mmh3` wheel is arm64. `import pinecone_text` fails. |
| Native Pythons | `/opt/homebrew/bin/python3.11` (3.11.15 arm64); `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13` (3.13.2 universal2); `python3` on PATH is 3.14.6 from Intel Homebrew |
| NLTK data | `~/nltk_data/tokenizers/punkt_tab` present (would mask F11 on this machine only) |
| `frontend/node_modules` | installed; `npm audit`: 11 vulnerabilities |
| Git | `feat/localai` = `main` (`3397d0b`); one uncommitted change: `frontend/package-lock.json` version `1.0.0` → `2.0.0`, matching `package.json` |
| `backend/.env` | present, untracked, placeholder values |
| `.claude/settings.local.json` | local plugin/permission config, gitignored |

---

## 9. What surprised me, in one place

1. Citations never reach the browser (`route.ts:187` sends a count; nothing sends the array).
2. The UI's AGENTIC mode is `simple_rag` (`chat.py:266-270`).
3. The app cannot start from `cp .env.example .env` (four `extra_forbidden` keys).
4. The venv on this machine is the wrong architecture; nothing can run until it is rebuilt.
5. A third of the backend is unreachable, and `/api/info` advertises parts of it.
6. Tests need live Pinecone; CI is given real keys.
7. Google Fonts on every page load, next to a self-hosted copy of the same font.
8. `pinecone-text` may download NLTK data at request time, to compute sparse vectors that are thrown away.
9. "Deleted when your session ends" means "deleted the next time this browser comes back".
10. Vector IDs come from `hash()`, salted per process, across four workers.
11. The `source` shown in citations is the temp filename (`tmpXXXX.pdf`), not the uploaded name.
12. Nothing secret has ever been committed, and the Docker image is properly non-root. Credit where due.
