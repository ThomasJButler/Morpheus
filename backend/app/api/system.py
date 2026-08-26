"""Health and model discovery. Facts only: what is reachable, what is
installed, where the store lives. No accuracy percentages, no feature ads
(the old /api/info advertised things that didn't exist: SECURITY_REVIEW F24)."""

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.ollama import OllamaError, normalise_model_name

router = APIRouter(prefix="/api", tags=["system"])


def _store_info(app) -> dict:
    settings = get_settings()
    info: dict = {
        "path": str(settings.data_dir.resolve()),
        "documents": None,
        "chunks": None,
        "size_bytes": None,
    }
    store = getattr(app.state, "store", None)
    if store is not None:
        info.update(store.stats())
    return info


@router.get("/health")
async def health(request: Request) -> dict:
    settings = get_settings()
    ollama = request.app.state.ollama
    out: dict = {
        "status": "degraded",
        "ollama": {
            "base_url": settings.ollama_base_url,
            "reachable": False,
            "version": None,
        },
        "models": {
            "chat": {"name": settings.ollama_chat_model, "installed": False},
            "embed": {"name": settings.ollama_embed_model, "installed": False},
        },
        "store": _store_info(request.app),
        "hints": [],
    }
    try:
        out["ollama"]["version"] = await ollama.version()
        out["ollama"]["reachable"] = True
        installed = await ollama.installed_models()
        for key, name in (
            ("chat", settings.ollama_chat_model),
            ("embed", settings.ollama_embed_model),
        ):
            ok = normalise_model_name(name) in installed
            out["models"][key]["installed"] = ok
            if not ok:
                out["hints"].append(f"ollama pull {name}")
    except OllamaError as exc:
        out["hints"].append(exc.hint or exc.message)
        return out
    if out["models"]["chat"]["installed"] and out["models"]["embed"]["installed"]:
        out["status"] = "ready"
    return out


@router.get("/models")
async def models(request: Request) -> dict:
    """Installed models, split into chat and embedding, with the configured
    one flagged. The Settings UI populates its dropdown from this."""
    settings = get_settings()
    ollama = request.app.state.ollama
    chat: list[dict] = []
    embed: list[dict] = []
    version = await ollama.version()
    for m in await ollama.list_models():
        name = m.get("name", "")
        details = m.get("details") or {}
        capabilities = None
        try:
            capabilities = (await ollama.show(name)).get("capabilities")
        except OllamaError:
            capabilities = None
        if capabilities is not None:
            is_embed = "embedding" in capabilities and "completion" not in capabilities
        else:
            family = (details.get("family") or "").lower()
            is_embed = "embed" in name.lower() or "bert" in family
        configured_name = settings.ollama_embed_model if is_embed else settings.ollama_chat_model
        entry = {
            "name": name,
            "size": m.get("size"),
            "parameter_size": details.get("parameter_size"),
            "configured": normalise_model_name(name) == normalise_model_name(configured_name),
        }
        (embed if is_embed else chat).append(entry)
    return {"chat": chat, "embed": embed, "ollama_version": version}
