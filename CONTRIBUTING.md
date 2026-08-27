# Contributing to Morpheus

Thanks for looking. Morpheus is a small project with one firm rule: it runs on the user's machine and nothing leaves it. Every contribution is checked against that rule by tests, so it is worth knowing them before you start.

## Getting set up

You need Ollama, Python 3.11 or newer, and Node 20 or newer. No accounts, no API keys, no `.env` file.

```bash
git clone https://github.com/ThomasJButler/Morpheus.git
cd Morpheus

ollama pull nomic-embed-text
ollama pull qwen3.5:0.8b                # the tiny model is enough for the integration test
ollama pull qwen3.5:9b                  # the default model, for actually using it

cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest                        # ~100 tests, all offline; one skips without Ollama

cd ../frontend
npm install
npm run test:ci                         # jest
npx playwright install chromium         # once
npm run test:e2e                        # Playwright, includes the no-external-request test
```

Run it with `uvicorn app.main:app` in `backend/` and `npm run dev` in `frontend/`.

## The tests that guard the point of the project

- `backend/tests/test_no_egress.py` refuses any socket that is not loopback across the whole upload-and-answer flow. If your change opens one, this fails.
- `backend/tests/test_no_cloud_imports.py` fails if `anthropic`, `openai`, `pinecone`, `langchain`, a telemetry client or a non-loopback URL appears in `backend/app/` or `requirements.txt`.
- `backend/tests/test_citations.py` and `test_pipeline.py` pin the citation contract: a marker that does not map to a retrieved chunk never reaches the client, and an empty library never calls the model.
- CI runs the backend suite inside a Linux network namespace with only loopback. A dependency that phones home at import time fails the build there even if no test targets it.
- `frontend/e2e/chat-flow.spec.ts` includes a test that routes every browser request and fails if one leaves localhost.

If a change needs any of those to be relaxed, the pull request has to say why, and the README has to change with it. Claims and code stay in step; that is the whole reason 2.0 exists.

## Working on it

- Branch from `main`. Small, focused commits with a subject in the imperative and a body that explains why, when the diff does not make it obvious.
- `ruff check app tests` in `backend/`, `npm run lint` and `npx tsc --noEmit` in `frontend/`.
- Non-trivial logic gets a test. Keep the fake Ollama in `backend/tests/fakes.py` for unit tests; mark anything that needs the real thing `@pytest.mark.integration` and skip it when Ollama is not listening, as the existing integration test does.
- Update `SECURITY_REVIEW.md` if you change anything on the request path (upload, parsing, retrieval, prompt, streaming), and `THREAT_MODEL.md` if you change what is defended.
- No em dashes in prose or comments; use a comma, colon or full stop.

Before you publish a fork or open a pull request, make sure nothing private came along for the ride:

```bash
git status --short
git check-ignore -v backend/.env backend/data
git grep -n -I -E "(sk-[A-Za-z0-9_-]{20,}|pcsk_[A-Za-z0-9_]{20,}|Bearer [A-Za-z0-9._~+/-]{20,})" -- . ':!package-lock.json'
```

## Reporting a security problem

Use GitHub's private vulnerability reporting on the repository rather than a public issue, and leave out the document or question that triggered it if either is sensitive.

## Reporting bugs and asking for things

Open an issue with your OS, Python and Node versions, the Ollama version and models installed (`ollama list`), what you did, what you expected, and what happened. The output of `curl http://127.0.0.1:8000/api/health` saves a round trip.
