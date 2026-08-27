from pathlib import Path

from app.core.config import Settings

BACKEND = Path(__file__).resolve().parents[1]


def test_env_example_loads_cleanly(monkeypatch):
    # The old .env.example crashed Settings with extra_forbidden (F25).
    # This test keeps the shipped example loadable forever.
    monkeypatch.delenv("API_HOST", raising=False)
    assert (BACKEND / ".env.example").exists()
    settings = Settings(_env_file=BACKEND / ".env.example")
    assert settings.api_host == "127.0.0.1"


def test_unknown_keys_are_ignored(tmp_path):
    env = tmp_path / "stale.env"
    env.write_text(
        "PINECONE_API_KEY=leftover\n"
        "USE_RERANKER=true\n"
        "ANTHROPIC_MODEL=claude-3-5-haiku-latest\n"
        "OLLAMA_CHAT_MODEL=qwen3.5:0.8b\n"
    )
    settings = Settings(_env_file=env)
    assert settings.ollama_chat_model == "qwen3.5:0.8b"


def test_defaults_are_loopback_and_local(monkeypatch):
    # Defaults, so nothing from the ambient environment (a container sets
    # API_HOST=0.0.0.0 on purpose) may leak in.
    for name in ("DATA_DIR", "RATE_LIMIT", "API_HOST", "OLLAMA_BASE_URL"):
        monkeypatch.delenv(name, raising=False)
    settings = Settings(_env_file=None)
    assert settings.api_host == "127.0.0.1"
    assert settings.ollama_base_url == "http://127.0.0.1:11434"
    assert str(settings.data_dir) == "data"
    assert settings.rate_limit == "60/minute"


def test_cors_origins_list_strips_whitespace():
    settings = Settings(
        _env_file=None,
        cors_origins=" http://localhost:3000 , http://127.0.0.1:3000 ",
    )
    assert settings.cors_origins_list == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_max_upload_bytes():
    settings = Settings(_env_file=None, max_upload_mb=2)
    assert settings.max_upload_bytes == 2 * 1024 * 1024
