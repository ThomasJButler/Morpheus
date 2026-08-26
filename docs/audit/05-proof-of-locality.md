# Proof of locality: the tests that fail if Morpheus stops being local

The claim to be defended: **during upload, indexing, retrieval and answering, Morpheus opens no network connection to anything except `127.0.0.1`** (its own port and Ollama on 11434). A claim like that is worth nothing without a check that would fail if it were false, so this document describes seven checks, what each one catches, and what each one misses. They overlap on purpose.

Out of scope, and said so in the README: `ollama pull` at install time, `pip` and `npm` at install time, and the Ollama desktop app's own update check (run `ollama serve` from a terminal if you want none of that).

---

## Layer 1: in-process socket guard (pytest, always on)

`backend/tests/test_no_egress.py` installs a fixture that patches the Python socket layer for the duration of a full upload → index → query → answer cycle through FastAPI's `TestClient`:

- `socket.socket.connect` and `connect_ex`: allowed only when the destination host is `127.0.0.1`, `::1` or `localhost`; anything else records the attempt and raises.
- `socket.create_connection`: same rule.
- `socket.getaddrinfo`: allowed only for loopback names, so a library that tries to resolve `api.example.com` fails at DNS with a recognisable error and the attempt is recorded.

At the end the fixture asserts the recorded list is empty. Two variants:

- **Unit variant** (runs everywhere, including CI): Ollama is replaced by a fake that returns fixed vectors and a canned streamed answer containing `[1]` and `[9]`. Proves the application code and every Python-level dependency (LanceDB's Python layer, pyarrow's Python layer, httpx, anything that imports `requests`, `urllib`, `nltk`, `posthog`, `langsmith`) never leave loopback.
- **Integration variant** (local, skipped when `127.0.0.1:11434` does not answer): real Ollama with `qwen3.5:0.8b` and `nomic-embed-text`. Proves the real request path, including the Ollama client, stays on loopback.

Sketch:

```python
LOOPBACK = ("127.0.0.1", "::1", "localhost")

def _is_loopback(host: str) -> bool:
    return host in LOOPBACK or host.startswith("127.")

@pytest.fixture
def no_egress(monkeypatch):
    attempts = []
    real_connect = socket.socket.connect
    real_gai = socket.getaddrinfo

    def guarded_connect(self, address):
        host = address[0] if isinstance(address, tuple) else str(address)
        if not _is_loopback(host):
            attempts.append(("connect", address))
            raise OSError(f"egress blocked: {address}")
        return real_connect(self, address)

    def guarded_gai(host, *args, **kwargs):
        if host is not None and not _is_loopback(str(host)):
            attempts.append(("dns", host))
            raise socket.gaierror(f"egress blocked: dns for {host}")
        return real_gai(host, *args, **kwargs)

    monkeypatch.setattr(socket.socket, "connect", guarded_connect)
    monkeypatch.setattr(socket.socket, "connect_ex", guarded_connect)
    monkeypatch.setattr(socket, "getaddrinfo", guarded_gai)
    yield attempts
    assert attempts == [], f"non-loopback network activity: {attempts}"
```

**Catches:** every connection made through Python's `socket` module, which includes asyncio (`loop.sock_connect` calls `sock.connect`) and therefore httpx under `TestClient`.

**Misses:** native code that calls `connect(2)` directly: Rust and C extensions (`lance`, `pyarrow`, `grpcio`, `onnxruntime`), and `uvloop` when the real server runs under uvicorn. That is why layers 2 and 3 exist.

---

## Layer 2: kernel-level sandbox on macOS (the dev machine)

`scripts/prove_local.sh` starts the backend under `sandbox-exec` with a profile that denies all network except loopback, then runs `scripts/smoke_local.sh` against it. If any code path, Python or native, tries to reach a non-loopback address, the kernel refuses the call; the smoke run then fails on whatever that code path was doing, and the sampler in layer 4 shows nothing but loopback.

Profile (`scripts/loopback-only.sb`):

```
(version 1)
(allow default)
(deny network*)
(allow network* (local ip "localhost:*"))
(allow network* (remote ip "localhost:*"))
```

Run:

```
scripts/prove_local.sh
  1. checks Ollama answers on 127.0.0.1:11434 and both models are installed
  2. sandbox-exec -f scripts/loopback-only.sb .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 &
  3. starts the lsof sampler (layer 4) on the backend pid and the ollama pid
  4. runs scripts/smoke_local.sh  (upload the handbook + a generated PDF, ask three DEMO-QUERIES questions, one off-corpus question, delete a document, confirm its text is gone from data/)
  5. stops everything, prints the endpoint set, exits non-zero if anything non-loopback appeared or the smoke failed
```

`sandbox-exec` is marked deprecated by Apple and still ships and works. If a future macOS removes it, the fallback is a `pf` anchor that blocks outbound traffic for the backend's user, documented in the script header, or layer 3 under Docker.

**Catches:** everything the process does, regardless of language.
**Misses:** Ollama's own egress (it runs outside the sandbox on purpose, so the sampler watches it too), and it is macOS-only.

---

## Layer 3: kernel-level network namespace on Linux (CI)

In `.github/workflows/backend-test.yml` the test job runs pytest inside a fresh network namespace that has only the loopback interface:

```yaml
- name: Run tests with no network
  run: |
    sudo unshare -n bash -c '
      ip link set lo up
      sudo -u "$SUDO_USER" -E env PATH="$PATH" .venv/bin/pytest -q
    '
```

Inside that namespace there is no route to anything but `127.0.0.1`; a connect to any other address fails with `ENETUNREACH` immediately. The unit variant of `test_no_egress` runs here (Ollama mocked), as does the whole suite, so any dependency that phones home during import or use fails the build. `sudo` is used rather than `unshare -rn` because Ubuntu 24.04 runners restrict unprivileged user namespaces.

**Catches:** everything, any language, on every CI run.
**Misses:** nothing on the backend side; the frontend has its own checks (layer 5).

---

## Layer 4: visibility, the `lsof` sampler

While the smoke runs, `scripts/prove_local.sh` samples every 0.5 s:

```
lsof -a -i -n -P -p <backend_pid>,<ollama_pid> | awk 'NR>1 {print $9}'
```

and collects the set of remote endpoints seen. Expected output at the end:

```
Remote endpoints observed during ingest + query (backend + ollama):
  127.0.0.1:11434
  127.0.0.1:8000
No non-loopback endpoints. PASS
```

**Catches:** a human-readable record of what actually happened, including Ollama.
**Misses:** connections shorter than the sampling interval. It is evidence, not the guard; the guard is layers 2 and 3.

The real output of this script on Tom's machine will be pasted into `SECURITY_REVIEW.md` section 5 once step 5 of the migration lands.

---

## Layer 5: the browser side

Two checks, because the frontend is where fonts, analytics and CDNs creep in.

1. **Playwright** (`frontend/e2e/chat-flow.spec.ts`): `page.route('**/*', ...)` records every request URL during the full flow (load, upload, ask, see citations) and the test asserts that every URL's host is `localhost` or `127.0.0.1`. Runs in CI against the dev server with the backend mocked at the network level (Playwright `route.fulfill`), so it is a test of the frontend's own behaviour.
2. **Build output grep** (CI step after `npm run build`):
   ```
   ! grep -rEo 'https?://[a-zA-Z0-9.-]+' .next/static .next/server 2>/dev/null | grep -vE 'localhost|127\.0\.0\.1|w3\.org|schema\.org|react\.dev|github\.com/ThomasJButler' 
   ```
   Fails if any external host is baked into the bundle (Google Fonts, analytics, a CDN).

---

## Layer 6: static supply-chain guard

`backend/tests/test_no_cloud_imports.py` walks `backend/app/` and `backend/requirements.txt` and fails, with file and line, on any of: `anthropic`, `openai`, `pinecone`, `langchain`, `langsmith`, `posthog`, `sentry`, `boto3`, `google.cloud`. It is the inverse of isq-agent's Matrix-leak test: a five-second check that keeps a cloud client from coming back in a future pull request. `pip-audit` runs in the same CI job.

---

## Layer 7: manual, Wi-Fi off

Documented in `DEPLOYMENT.md` (local install guide) so anyone can repeat it:

1. Start Ollama (`ollama serve` in a terminal, or the app), start the backend, start the frontend.
2. Turn Wi-Fi off (and unplug Ethernet).
3. Upload `backend/test-documents/techcorp-employee-handbook.md`.
4. Ask the questions in `backend/test-documents/DEMO-QUERIES.md`. Each answer should carry `[n]` markers; clicking one highlights the matching passage.
5. Ask "What is the capital of France?" and get the refusal, because it is not in the handbook.
6. Delete the document, then `grep -r "TechCorp" backend/data/` returns nothing.

If any step fails with the network off, the claim is false and the README must change.

---

## What "fully local" does and does not mean after this

- **Means:** no bytes leave the machine while you use it; the proof runs on every CI build and can be run on your laptop in one command.
- **Does not mean:** the model files appeared by magic. Two `ollama pull`s and the package installs are network activity, at install time, and are listed as such.
- **Does not mean:** immune to prompt injection. Documents are treated as data and every citation is verified; a document can still try to steer the wording of an answer, and the UI shows when an answer cites nothing.
- **Does not mean:** encrypted at rest. `backend/data/` is a directory owned by your user with mode 0700; disk encryption is the operating system's job (FileVault).
