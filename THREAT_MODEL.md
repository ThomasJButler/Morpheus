# Threat Model

Morpheus is a **single-user document question-answering tool that runs on one machine**. This document states the trust boundary so that anyone changing the code can reason about a security decision without reading the whole codebase. It describes the design being built on `feat/localai`; `SECURITY_REVIEW.md` records what the code did before that work and tracks each finding to its fix.

## What Morpheus is for

You upload documents, they are indexed on your disk, you ask questions, you get answers whose `[n]` markers each point at a real passage from your files. Nothing is sent anywhere. That last sentence is the product, and it is enforced by tests rather than asserted (see `docs/audit/05-proof-of-locality.md`).

## Assets, in order

1. The documents and everything derived from them: extracted text, chunks, embeddings, previews, answers.
2. The integrity of an answer: that a cited passage exists and was retrieved for this question.
3. Availability of the tool on the user's own machine.

There are no accounts, no API keys, and no operator-side secrets. There is nothing to steal from a server because there is no server beyond the user's laptop.

## Trust boundary

```
[ browser tab on localhost:3000 ]  ──►  [ FastAPI on 127.0.0.1:8000 ]  ──►  [ Ollama on 127.0.0.1:11434 ]
                                                    │
                                                    ▼
                                         [ backend/data/  (LanceDB + temp files) ]
```

- **Trusted:** the user, their browser, the operating system, Ollama, the model files they chose to pull.
- **Untrusted:** the content of every uploaded document. It is input to a parser (a classic attack surface) and input to a language model (an instruction-following surface).
- **Not on the diagram:** the network. The backend binds to loopback by default. Exposing it on a LAN is an explicit opt-in (`API_HOST`) with a warning in `DEPLOYMENT.md`, and the app still has no authentication, so that is a "your network, your call" setting.

## What is defended, and how

| Threat | Defence | Where |
|---|---|---|
| Data leaves the machine | No cloud client is importable; loopback-only HTTP; static and runtime egress tests; CI runs the suite in a network namespace with only loopback | `tests/test_no_cloud_imports.py`, `tests/test_no_egress.py`, `scripts/prove_local.sh`, CI |
| Oversized upload exhausts memory or disk | Request body capped at the ASGI layer before any read | `app/core/body_limit.py` |
| Malicious document hangs or crashes the parser | Maintained parser (`pypdf` 6), page and character caps, parse errors mapped to 422 without tracebacks | `app/utils/document_processor.py` |
| Temp file left behind with document contents | Temp files live under `data/tmp` (0700) and are removed in `finally` | `app/api/documents.py` |
| Instructions inside a document steer the model | Documents are placed in a guarded, escaped, numbered block with a policy that overrides the persona; every citation is validated against the retrieved set; the UI shows when an answer cites nothing | `app/core/prompts.py`, `app/rag/citations.py` |
| Fabricated or misleading citations | Only `[n]` markers that map to a retrieved chunk reach the client; unknown markers are dropped in the stream; no retrieval means a fixed refusal and no model call | `app/rag/citations.py`, `app/rag/pipeline.py` |
| A runaway local script hammers the backend | Per-IP rate limit (belt and braces on loopback) | `app/core/rate_limit.py` |
| Wrong or missing model silently substituted | Health reports the configured models and whether they are installed; the backend never falls back to a different model | `app/core/ollama.py`, `GET /api/health` |
| Sensitive text in logs | Logs carry counts, durations, hashes and error codes; never query text, document text or filenames at INFO | `app/main.py` logging policy |

## What is not defended, on purpose

- **Other processes running as your user.** `backend/data/` is a normal directory with mode 0700. Anything running as you can read it, the same as any file you own. Disk encryption is the operating system's job.
- **Prompt injection is mitigated, not prevented.** A document can still try to steer the wording of an answer. The guard block, the policy and the citation validator make that visible; they do not make it impossible. The README says "treated as data", never "immune".
- **Model quality.** A local 9B-class model is weaker than a hosted frontier model. The citation validator turns that weakness into a visible "not grounded" rather than a silent wrong answer, which is the most the tool can honestly promise.
- **Ollama itself.** Ollama is trusted. Its desktop app checks for updates; `ollama pull` downloads models. Both are install-time and are listed in the README. Run `ollama serve` from a terminal if you want no background network activity at all.
- **A shared machine with hostile users.** The tool is single-user. Running it on a multi-user host where others can reach `127.0.0.1:8000` is outside the model.

## Known gaps

1. **No authentication when exposed on a LAN.** Deliberate for the local default; a real gap if someone flips `API_HOST`. A bearer-token option is a small addition if anyone needs it.
2. **No local reranker.** Ollama does not serve cross-encoders. Retrieval quality relies on hybrid vector + BM25 fusion.
3. **Parser timeouts.** Page and character caps bound the work; there is no wall-clock timeout on `pypdf` because a Python thread cannot be killed. A pathological PDF within the caps could still be slow.
4. **Agentic tool use** is not implemented. "Deep" mode is multi-query retrieval, which is what the docs say it is.

## Logging policy

INFO logs may contain: request path, status code, durations, counts (chunks, retrieved, cited), model names, a short hash of a document's source name. INFO logs must not contain: query text, document text, filenames in clear, stack traces (those go to DEBUG). Anything that would let a log reader reconstruct a document or a question is a bug.

## Reporting

Open a GitHub issue that does not include the document or query that triggered the problem. If it is sensitive, say so in the issue and a private channel will be arranged.
