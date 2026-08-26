# Backend tests

All offline. One test talks to a real Ollama and skips itself when there is none.

```bash
.venv/bin/pytest                # the lot, about 100 tests, a few seconds
.venv/bin/pytest -q -rs         # show why anything skipped
.venv/bin/pytest -m integration # only the real-Ollama test
```

`tests/conftest.py` gives every test a private `DATA_DIR` in a temp directory, clears the settings cache, and hands the app a fake Ollama (`tests/fakes.py`) whose embeddings are feature-hashed so texts that share words get similar vectors. The store underneath is real LanceDB on disk, not a mock.

## What each file proves

| File | The property |
|---|---|
| `test_config.py` | `.env.example` loads; unknown keys are ignored; defaults are loopback |
| `test_ollama_client.py` | embed batching, NDJSON stream parsing, connect and 404 error mapping (`ollama pull` hint) |
| `test_system.py` | health reports ready or degraded with hints; models split into chat and embed; data dir created 0700 |
| `test_chunking.py` | size bound, exact overlap, every word survives, deterministic |
| `test_document_processor.py` | txt, md, docx and real PDFs parse; page and character caps; malformed input gives a fixed message |
| `test_store.py` | deterministic ids, replace on re-upload, BM25 rescues a rare token, delete removes the bytes from disk (grep for a nonce), model mismatch refused |
| `test_documents.py` | 413 before the handler runs (a spy proves it), chunked bodies cut off, no temp residue after any failure, filename sanitised, delete and clear |
| `test_prompts.py` | one guard block, a document cannot close it, filename and question neutralised |
| `test_citations.py` | valid markers pass and fire once, fabricated markers never appear (also when split across tokens), think blocks stripped |
| `test_pipeline.py` | empty library refuses without calling the model, unknown model override refused, deep mode makes two calls, ungrounded answers flagged |
| `test_no_cloud_imports.py` | no cloud SDK, telemetry client or non-loopback URL in `app/` or `requirements.txt` |
| `test_no_egress.py` | the full flow under a socket guard that refuses non-loopback; unit variant with the fake, integration variant with real Ollama |

## Beyond pytest

- `scripts/prove_local.sh` (macOS) runs the backend under a seatbelt profile that denies all non-loopback network, drives a real ingest-and-query cycle, and samples `lsof`. The sanity check at the top verifies the sandbox actually blocks an outbound request before trusting it.
- CI runs the suite inside a Linux network namespace with only loopback (`sudo unshare -n`), which also covers native code the Python socket guard cannot see. The same property was rehearsed locally in a container started with `--network none`.
