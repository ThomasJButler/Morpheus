import os
import stat
from pathlib import Path


def test_root(client):
    body = client.get("/").json()
    assert body["name"] == "Morpheus API"
    assert body["health"] == "/api/health"


def test_health_ready(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ready"
    assert body["ollama"]["reachable"] is True
    assert body["models"]["chat"] == {"name": "qwen3.5:9b", "installed": True}
    assert body["models"]["embed"]["installed"] is True
    assert body["hints"] == []
    assert body["store"]["path"].endswith("data")


def test_health_degraded_when_model_missing(client, fake_ollama):
    fake_ollama.models = ["nomic-embed-text:latest"]
    body = client.get("/api/health").json()
    assert body["status"] == "degraded"
    assert body["models"]["chat"]["installed"] is False
    assert "ollama pull qwen3.5:9b" in body["hints"]


def test_health_degraded_when_ollama_down(client, fake_ollama):
    fake_ollama.unavailable = True
    body = client.get("/api/health").json()
    assert body["status"] == "degraded"
    assert body["ollama"]["reachable"] is False
    assert any("ollama serve" in h for h in body["hints"])


def test_models_split_and_configured_flag(client):
    body = client.get("/api/models").json()
    chat_names = [m["name"] for m in body["chat"]]
    embed_names = [m["name"] for m in body["embed"]]
    assert "qwen3.5:9b" in chat_names
    assert "nomic-embed-text:latest" in embed_names
    configured_chat = [m["name"] for m in body["chat"] if m["configured"]]
    assert configured_chat == ["qwen3.5:9b"]
    # nomic-embed-text (configured) matches nomic-embed-text:latest (installed)
    configured_embed = [m["name"] for m in body["embed"] if m["configured"]]
    assert configured_embed == ["nomic-embed-text:latest"]


def test_models_503_when_ollama_down(client, fake_ollama):
    fake_ollama.unavailable = True
    resp = client.get("/api/models")
    assert resp.status_code == 503
    detail = resp.json()["detail"]
    assert detail["code"] == "ollama_unavailable"
    assert "ollama serve" in detail["hint"]


def test_data_dir_created_private(client):
    from app.core.config import get_settings

    data_dir = Path(get_settings().data_dir)
    assert data_dir.is_dir()
    assert (data_dir / "tmp").is_dir()
    assert stat.S_IMODE(os.stat(data_dir).st_mode) == 0o700
