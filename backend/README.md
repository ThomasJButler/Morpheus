# Morpheus backend

FastAPI service that indexes documents into a local LanceDB store, retrieves with hybrid search, and streams answers from a model running in Ollama, with every citation verified before it reaches the client. Binds to `127.0.0.1:8000` and talks only to Ollama on `127.0.0.1:11434`.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app          # or: python -m app.main
```

No `.env` is needed. `.env.example` lists every setting with its default; `../DEPLOYMENT.md` explains the ones worth changing.

## Endpoints

| Method and path | What it does |
|---|---|
| `GET /api/health` | Ollama reachable, configured models installed, store path and counts, hints such as `ollama pull ...` |
| `GET /api/models` | Installed Ollama models, split into chat and embedding, with the configured ones flagged |
| `POST /api/chat` | Server-Sent Events: `mode`, `token`, `citation`, `done`, `error`, then `[DONE]`. Body `{message, mode: hybrid|vector, deep, model?}` |
| `POST /api/documents/upload` | Multipart `file`; PDF, DOCX, TXT, MD; capped before the body is read |
| `GET /api/documents` | The library: source, chunks, pages, added_at |
| `POST /api/documents/delete` | `{source}`; removes the chunks and compacts old versions so the text leaves the disk |
| `DELETE /api/documents` | Clears the library |
| `GET /api/documents/stats` | Documents, chunks, bytes on disk |

Interactive docs at `/docs`.

## Layout

```
app/
  main.py                 app factory: middleware order, error handlers, lifespan (store + Ollama client)
  core/config.py          settings; every default has its reason in a comment
  core/ollama.py          the only network client: /api/embed, /api/chat (stream), /api/tags
  core/store.py           LanceDB table, deterministic chunk ids, hybrid search with RRF, delete + compact
  core/prompts.py         policy above persona; documents in a guarded, escaped, numbered block
  core/body_limit.py      request body cap at the ASGI layer (from isq-agent, MIT)
  core/rate_limit.py      per-IP limiter (from isq-agent, MIT)
  rag/pipeline.py         embed, retrieve, refuse-or-generate, stream
  rag/citations.py        the streaming [n] validator
  api/                    system (health, models), documents, chat
  utils/                  chunker, parsers with caps
tests/                    see TESTING.md
scripts/                  prove_local.sh, smoke_local.sh, loopback-only.sb
test-documents/           the sample handbook and demo questions
```

## Tests

```bash
.venv/bin/pytest                         # everything; the Ollama integration test skips if 11434 is silent
.venv/bin/pytest -m integration          # just the real-Ollama run (needs qwen3.5:0.8b pulled)
.venv/bin/ruff check app tests
.venv/bin/pip-audit
scripts/prove_local.sh                   # macOS: kernel sandbox + lsof sampling, full ingest-and-query cycle
```

`TESTING.md` describes what each test file proves.

## Logging

Counts, durations, model names and error codes at INFO. Never query text, document text or filenames; deletion takes the filename in a POST body precisely so the access log does not carry it. The policy lives in `../THREAT_MODEL.md`.
