"""Shared fixtures. Every test runs with a private data dir and fresh
settings; the app's Ollama client is a fake unless a test opts into the
real one (marked `integration`)."""

import pytest
from fastapi.testclient import TestClient

from tests.fakes import FakeOllama


@pytest.fixture(autouse=True)
def isolated_settings(tmp_path, monkeypatch):
    # chdir so a stray .env in the repo can never leak into a test, and so
    # relative data paths land in the test's own tmp dir.
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("RATE_LIMIT", "10000/minute")
    from app.core.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def fake_ollama() -> FakeOllama:
    return FakeOllama()


@pytest.fixture
def client(fake_ollama):
    from app.main import app

    app.state.ollama = fake_ollama
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.state.ollama = None
