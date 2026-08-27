"""The claim "zero network egress at inference time", enforced as a test.

The guard patches the socket layer: any connect or DNS lookup whose target
is not loopback is recorded and refused, and the fixture fails the test on
teardown if anything was recorded. The unit variant drives the full
upload -> chat -> delete flow with the fake Ollama (runs anywhere, no
models needed); the integration variant runs the same flow against the
real Ollama with the small qwen3.5:0.8b and is skipped when Ollama isn't
listening.

Scope, honestly stated: this guard sees everything that goes through
Python's socket module, which includes asyncio and httpx. It cannot see
native code that calls connect() directly (LanceDB's Rust core, for one).
The kernel-level layers cover that: scripts/prove_local.sh on macOS and
the network-namespace pytest job in CI.
"""

import json
import socket

import pytest
from fastapi.testclient import TestClient

LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost", "testserver", ""}


def _is_loopback(host: str) -> bool:
    return host in LOOPBACK_HOSTS or host.startswith("127.")


@pytest.fixture
def egress_guard(monkeypatch):
    attempts: list = []
    real_connect = socket.socket.connect
    real_getaddrinfo = socket.getaddrinfo

    def guarded_connect(self, address):
        if isinstance(address, (str, bytes)):
            # AF_UNIX: a filesystem path, local by definition.
            return real_connect(self, address)
        host = address[0]
        if isinstance(host, bytes):
            host = host.decode(errors="replace")
        if not _is_loopback(str(host)):
            attempts.append(("connect", address))
            raise OSError(f"egress blocked: connect to {address!r}")
        return real_connect(self, address)

    def guarded_getaddrinfo(host, *args, **kwargs):
        if host is not None and not _is_loopback(str(host)):
            attempts.append(("dns", host))
            raise socket.gaierror(f"egress blocked: dns for {host!r}")
        return real_getaddrinfo(host, *args, **kwargs)

    monkeypatch.setattr(socket.socket, "connect", guarded_connect)
    monkeypatch.setattr(socket.socket, "connect_ex", guarded_connect)
    monkeypatch.setattr(socket, "getaddrinfo", guarded_getaddrinfo)
    yield attempts
    assert attempts == [], f"non-loopback network activity: {attempts}"


def test_the_guard_itself_blocks(egress_guard):
    """A guard that can't fail proves nothing; make it catch a real attempt."""
    with pytest.raises(OSError):
        socket.create_connection(("203.0.113.9", 80), timeout=1)
    assert egress_guard, "the guard recorded nothing"
    egress_guard.clear()  # the attempt was deliberate; don't fail teardown


def _sse(client, payload):
    events = []
    with client.stream("POST", "/api/chat", json=payload) as resp:
        assert resp.status_code == 200, resp.read()
        for line in resp.iter_lines():
            if line.startswith("data: "):
                data = line[len("data: ") :]
                if data == "[DONE]":
                    break
                events.append(json.loads(data))
    return events


CORPUS = (
    "The launch code word is BANANA_TELEPORT_99.\n\n"
    "Remote work needs manager approval and a privacy screen in public."
)


def test_full_flow_no_egress_unit(egress_guard, client, fake_ollama):
    """Upload, list, chat, stats, delete: not one socket leaves loopback.

    The store is real LanceDB writing to disk; only the model is faked, so
    this catches any dependency that phones home from the request path."""
    resp = client.post(
        "/api/documents/upload",
        files={"file": ("secret.md", CORPUS.encode(), "text/markdown")},
    )
    assert resp.status_code == 200, resp.text

    fake_ollama.answer = "It is BANANA_TELEPORT_99 [1]."
    events = _sse(client, {"message": "What is the launch code word?"})
    assert any(e["type"] == "citation" for e in events)
    done = next(e["done"] for e in events if e["type"] == "done")
    assert done["grounded"] is True

    assert client.get("/api/documents").status_code == 200
    assert client.get("/api/documents/stats").status_code == 200
    assert client.get("/api/health").status_code == 200
    assert client.post("/api/documents/delete", json={"source": "secret.md"}).status_code == 200
    # egress_guard asserts attempts == [] on teardown


SMALL_MODEL = "qwen3.5:0.8b"


def _ollama_has_small_model() -> bool:
    try:
        import httpx

        tags = httpx.get("http://127.0.0.1:11434/api/tags", timeout=2).json()
        return any(m.get("name") == SMALL_MODEL for m in tags.get("models", []))
    except (httpx.HTTPError, ValueError):
        return False


@pytest.mark.integration
@pytest.mark.skipif(
    not _ollama_has_small_model(),
    reason=f"Ollama with {SMALL_MODEL} not available on 127.0.0.1:11434",
)
def test_full_flow_no_egress_real_ollama(egress_guard, monkeypatch, tmp_path):
    """The same flow with the real Ollama client and a real (tiny) model.

    Only the egress property is asserted, not answer quality: a 0.8b model
    is allowed to write a bad answer, it is not allowed to open a socket to
    anywhere but loopback."""
    monkeypatch.setenv("OLLAMA_CHAT_MODEL", SMALL_MODEL)
    from app.core.config import get_settings

    get_settings.cache_clear()
    from pathlib import Path

    from app.main import app

    assert getattr(app.state, "ollama", None) is None
    handbook = (
        Path(__file__).resolve().parents[1]
        / "test-documents"
        / "techcorp-employee-handbook.md"
    ).read_bytes()
    with TestClient(app, raise_server_exceptions=False) as client:
        resp = client.post(
            "/api/documents/upload",
            files={"file": ("handbook.md", handbook, "text/markdown")},
        )
        assert resp.status_code == 200, resp.text
        events = _sse(client, {"message": "Who is the CTO?"})
        done = next(e["done"] for e in events if e["type"] == "done")
        assert done["retrieved"] > 0
        assert done["model"] == SMALL_MODEL
