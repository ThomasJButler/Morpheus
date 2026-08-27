# Running Morpheus

Morpheus runs on one machine. This guide covers the native setup, the Docker Compose alternative, configuration, and what to check when something is off.

## Prerequisites

| Need | Why |
|---|---|
| [Ollama](https://ollama.com) | Runs the embedding and chat models on `127.0.0.1:11434` |
| Python 3.11 or newer | Backend |
| Node 20 or newer | Frontend |

Pull the two models once. This is the only network activity Morpheus involves, and it happens now, not when you use it:

```bash
ollama pull nomic-embed-text      # embeddings, 274 MB
ollama pull qwen3.5:9b            # answers, 6.6 GB; qwen3.5:27b if you have the memory
```

## Native (recommended)

```bash
# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app          # 127.0.0.1:8000, docs at /docs

# Frontend, second terminal
cd frontend
npm install
npm run dev                             # http://localhost:3000
```

For a production build of the frontend: `npm run build && npm run start`. It still talks to the local backend.

## Docker Compose

Ollama stays on the host (models want the host's RAM and GPU). With Ollama running:

```bash
docker compose up --build
```

Both ports publish on `127.0.0.1` only. The library bind-mounts to `./backend/data`, so it survives rebuilds and stays visible as plain files. On Docker Desktop the container reaches the host's Ollama through `host.docker.internal` with no changes. On Linux, Ollama has to listen on the docker bridge as well as loopback (`OLLAMA_HOST=0.0.0.0:11434`, firewalled to the bridge).

## Configuration

Nothing is required. Every setting has a default that runs on a laptop; override any of them in `backend/.env` or the environment. `backend/.env.example` lists them all. The ones people actually change:

| Variable | Default | Notes |
|---|---|---|
| `OLLAMA_CHAT_MODEL` | `qwen3.5:9b` | Any installed chat model; the Settings dialog can override per session |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Changing it means re-indexing; the store refuses to mix models |
| `DATA_DIR` | `data` | Where the library lives, mode 0700 |
| `MAX_UPLOAD_MB` | `25` | Enforced before the upload is read |
| `MAX_PDF_PAGES`, `MAX_TEXT_CHARS` | `500`, `2000000` | Parser work caps |
| `TOP_K`, `MIN_VECTOR_SCORE` | `6`, `0.5` | How many chunks reach the prompt, and the cosine floor |
| `API_HOST` | `127.0.0.1` | See the warning below before changing it |

Frontend: `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:8000`).

## Exposing it beyond your machine

Do not, casually. Morpheus has no authentication: anyone who can reach port 8000 can read the library, upload to it and delete from it. That is fine on `127.0.0.1`, which is the default, and it is a decision if you set `API_HOST=0.0.0.0` to use it from another device. If you do, put it behind something that authenticates (Tailscale, a VPN, a reverse proxy with auth), add the frontend's origin to `CORS_ORIGINS`, and remember that "local" then means "your network", not "your machine".

## Verifying that nothing leaves

```bash
cd backend
.venv/bin/pytest                        # includes tests/test_no_egress.py
scripts/prove_local.sh                  # macOS only; needs Ollama running
```

The manual version: start everything, turn Wi-Fi off, upload `backend/test-documents/techcorp-employee-handbook.md`, ask "Who is the CTO?" and watch the `[n]` marker appear with its citation, then ask "What is the capital of France?" and get the refusal. Delete the document and `grep -r TechCorp backend/data` finds nothing.

## Troubleshooting

`/api/health` on the backend reports what is wrong and, where it can, the command that fixes it.

| Symptom | Cause | Fix |
|---|---|---|
| Health says Ollama is not reachable | Ollama is not running | `ollama serve`, or start the desktop app |
| Health lists `ollama pull ...` under hints | A configured model is not installed | Run the command it shows |
| Health shows a store error naming two models | The index was built with a different embedding model | Delete `backend/data/lancedb` to re-index, or set `OLLAMA_EMBED_MODEL` back |
| Upload returns 413 | Over `MAX_UPLOAD_MB`, or the PDF exceeds the page or character caps | Raise the cap, or split the document |
| Upload returns 422 "Could not read this PDF" | Malformed or image-only PDF | There is no OCR; export the PDF with a text layer |
| First answer takes 10 seconds, later ones take 2 | Ollama loads the model on first use | Expected; `OLLAMA_KEEP_ALIVE` controls how long it stays resident |
| Port 8000 busy | Another process | `uvicorn app.main:app --port 8001` and set `NEXT_PUBLIC_API_URL` to match |
