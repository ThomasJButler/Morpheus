"""Runtime settings.

Nothing here is required. The defaults run Morpheus on a laptop that has
Ollama installed: bound to loopback, talking only to loopback, keeping
everything it stores under ./data. Each limit carries the reason for its
default, because a limit without a reason is the first thing a future edit
deletes.

Environment variables override fields (case-insensitive) and a .env file in
the working directory is read if present. Unknown keys are ignored, so a
stale .env from an older version can never stop the app from starting
(that happened: SECURITY_REVIEW.md F25).
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Ollama: the only process Morpheus talks to, on loopback ------------
    ollama_base_url: str = "http://127.0.0.1:11434"
    # ~6.6 GB at Q4; comfortable on a 32 GB Apple Silicon machine.
    # qwen3.5:27b is the quality option if you have the memory and patience.
    ollama_chat_model: str = "qwen3.5:9b"
    # 768-d, 8k context, ~274 MB, English-focused. bge-m3 if you need
    # multilingual. Changing this means re-indexing; the store refuses to mix.
    ollama_embed_model: str = "nomic-embed-text"
    # Fail in 3 s when Ollama is down instead of hanging every request.
    ollama_connect_timeout_s: float = 3.0
    # A cold 9B load plus a long answer can take this long on CPU.
    ollama_read_timeout_s: float = 180.0
    # Keep the model resident between questions (Ollama's own default is 5m).
    ollama_keep_alive: str = "15m"
    ollama_embed_batch_size: int = 32

    # --- Storage: everything Morpheus keeps lives under here ----------------
    data_dir: Path = Path("data")

    # --- Upload limits, enforced before the body is read ---------------------
    # 25 MB is roughly a 1,000-page text PDF. Scanned-image PDFs are bigger
    # and useless here anyway (no OCR).
    max_upload_mb: int = 25
    # Caps the parser's work on a pathological file. Breaching either is a 422.
    max_pdf_pages: int = 500
    max_text_chars: int = 2_000_000

    # --- Chunking and retrieval ----------------------------------------------
    chunk_size: int = 1000
    chunk_overlap: int = 200
    # How many chunks reach the prompt.
    top_k: int = 6
    # How many candidates each retriever (vector, BM25) contributes to fusion.
    candidates: int = 20
    # Cosine floor for vector hits. nomic similarities cluster higher than
    # OpenAI's did; tuned against test-documents/DEMO-QUERIES.md.
    min_vector_score: float = 0.5
    # Deep mode asks the model for up to this many sub-questions.
    deep_max_subqueries: int = 3

    # --- Generation -----------------------------------------------------------
    temperature: float = 0.2
    num_ctx: int = 8192
    max_answer_tokens: int = 1024

    # --- HTTP -----------------------------------------------------------------
    # Loopback unless you know exactly why you want otherwise; there is no
    # auth, so exposing this on a LAN is an explicit decision (DEPLOYMENT.md).
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Belt and braces on loopback: stops a runaway local script, nothing more.
    rate_limit: str = "60/minute"
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
