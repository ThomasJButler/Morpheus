"""FastAPI entry point: local document question answering with verified
citations.

Everything this app talks to is on 127.0.0.1: the browser in front, Ollama
behind, and a LanceDB directory on disk. That claim is enforced by tests
(tests/test_no_egress.py, scripts/prove_local.sh), not by this docstring.

Logging policy (THREAT_MODEL.md): counts, durations, model names and error
codes at INFO. Never query text, document text or filenames.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.system import router as system_router
from app.core.body_limit import MaxBodySizeMiddleware
from app.core.config import get_settings
from app.core.ollama import OllamaClient, OllamaError, normalise_model_name
from app.core.rate_limit import limiter
from app.core.store import Store, StoreError

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
# httpx logs every request URL at INFO; ours carry no secrets, but quiet is quiet.
for _noisy in ("httpx", "httpcore"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    data_dir = settings.data_dir
    data_dir.mkdir(parents=True, exist_ok=True)
    # 0700: the store holds document text; other users on the machine have no
    # business in it. Processes running as you can read it, like any file.
    os.chmod(data_dir, 0o700)
    (data_dir / "tmp").mkdir(exist_ok=True)

    # The store opens (or creates) the on-disk index. A model mismatch is a
    # refusal, not a crash: the app boots, health explains, chat declines.
    app.state.store = None
    app.state.store_error = None
    try:
        app.state.store = Store(
            settings.data_dir / "lancedb", embed_model=settings.ollama_embed_model
        )
    except StoreError as exc:
        app.state.store_error = str(exc)
        logger.error("Store unavailable: %s", exc)

    # Tests inject a fake client before startup; create the real one otherwise.
    owned_client = getattr(app.state, "ollama", None) is None
    if owned_client:
        app.state.ollama = OllamaClient(
            settings.ollama_base_url,
            connect_timeout=settings.ollama_connect_timeout_s,
            read_timeout=settings.ollama_read_timeout_s,
            keep_alive=settings.ollama_keep_alive,
            embed_batch_size=settings.ollama_embed_batch_size,
        )

    logger.info(
        "Morpheus backend: chat=%s embed=%s data=%s ollama=%s bind=%s:%s",
        settings.ollama_chat_model,
        settings.ollama_embed_model,
        data_dir.resolve(),
        settings.ollama_base_url,
        settings.api_host,
        settings.api_port,
    )
    # Startup health is advisory: log and carry on, /api/health reports live
    # state, and the app must boot for its hints to be reachable at all.
    try:
        version = await app.state.ollama.version()
        installed = await app.state.ollama.installed_models()
        for name in (settings.ollama_chat_model, settings.ollama_embed_model):
            if normalise_model_name(name) not in installed:
                logger.warning("Model %r is not installed. Run: ollama pull %s", name, name)
        logger.info("Ollama %s reachable", version)
    except OllamaError as exc:
        logger.warning("%s%s", exc.message, f" ({exc.hint})" if exc.hint else "")

    yield

    if owned_client:
        await app.state.ollama.aclose()
        app.state.ollama = None
    app.state.store = None
    app.state.store_error = None


app = FastAPI(
    title="Morpheus API",
    description="Local document question answering with verified citations.",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Order matters: body cap added first so CORS (added after) ends up outermost
# and a 413 still carries CORS headers the browser can read.
app.add_middleware(MaxBodySizeMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(OllamaError)
async def ollama_error_handler(request: Request, exc: OllamaError):
    logger.warning("Ollama error on %s: %s", request.url.path, exc.message)
    detail: dict = {"code": exc.code, "message": exc.message}
    if exc.hint:
        detail["hint"] = exc.hint
    return JSONResponse(status_code=exc.status, content={"detail": detail})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    # Full traceback to the log, a fixed message to the client. Exception text
    # used to leak service internals to callers (SECURITY_REVIEW F8).
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": {"code": "internal_error", "message": "Internal server error."}},
    )


app.include_router(system_router)
app.include_router(documents_router)
app.include_router(chat_router)


@app.get("/")
async def root() -> dict:
    return {
        "name": "Morpheus API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        log_level=settings.log_level.lower(),
    )
