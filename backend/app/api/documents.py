"""Document endpoints: upload, list, delete one, clear, stats.

The ASGI body cap (core/body_limit.py) has already refused an oversized body
before the upload handler runs, so nothing here buffers unbounded input. The
file streams to data/tmp (0600 via mkstemp), is parsed under hard caps,
chunked, embedded through Ollama with the `search_document:` prefix nomic
expects, and stored. The temp file is removed in `finally`, so a failed
parse can't strand document text in a temp directory (SECURITY_REVIEW F4).
The stored `source` is the sanitised original filename, not the temp name
(F22), because it is shown in citations and interpolated into prompts.
"""

import asyncio
import logging
import os
import re
import tempfile
import time
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.store import StoreModelMismatch
from app.utils.chunking import chunk_text
from app.utils.document_processor import (
    SUPPORTED_SUFFIXES,
    DocumentProcessingError,
    DocumentTooLarge,
    extract,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

_DISALLOWED = re.compile(r"[^A-Za-z0-9._ -]")


def sanitise_filename(name: str | None) -> str:
    """The filename is client input with three audiences: the filesystem
    (suffix only), citations in the UI, and the prompt. None of them get it
    raw. Keep [A-Za-z0-9._ -], drop any path, cap the length, never empty."""
    name = Path(name or "upload").name
    name = _DISALLOWED.sub("_", name).strip(" .")
    if not name or set(name) <= {"_", ".", " ", "-"}:
        return "upload"
    if len(name) > 120:
        suffix = Path(name).suffix[:10]
        name = name[: 120 - len(suffix)] + suffix
    return name


def _get_store(request: Request):
    store = getattr(request.app.state, "store", None)
    if store is None:
        message = (
            getattr(request.app.state, "store_error", None)
            or "The document store is unavailable."
        )
        raise HTTPException(
            status_code=503,
            detail={"code": "store_unavailable", "message": message},
        )
    return store


@router.post("/upload")
@limiter.limit(lambda: get_settings().rate_limit)
async def upload_document(request: Request, file: Annotated[UploadFile, File()]):
    settings = get_settings()
    store = _get_store(request)

    source = sanitise_filename(file.filename)
    suffix = Path(source).suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type {suffix or '(none)'}. "
                "Supported: .pdf, .txt, .md, .docx."
            ),
        )

    started = time.perf_counter()
    tmp_dir = settings.data_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=tmp_dir, suffix=suffix)
    tmp_path = Path(tmp_name)
    try:
        try:
            with os.fdopen(fd, "wb") as out_file:
                while piece := await file.read(1024 * 1024):
                    out_file.write(piece)
            entries = await asyncio.to_thread(
                extract,
                tmp_path,
                max_pdf_pages=settings.max_pdf_pages,
                max_text_chars=settings.max_text_chars,
            )
        finally:
            # The whole point: no plaintext copy survives any failure path.
            tmp_path.unlink(missing_ok=True)
    except DocumentTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except DocumentProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    chunks: list[dict] = []
    pages: int | None = None
    for entry in entries:
        for piece in chunk_text(
            entry["text"],
            chunk_size=settings.chunk_size,
            overlap=settings.chunk_overlap,
        ):
            chunks.append({"text": piece, "page": entry["page"]})
        if entry["page"] is not None:
            pages = max(pages or 0, entry["page"])
    if not chunks:
        raise HTTPException(status_code=422, detail="No indexable text found.")

    ollama = request.app.state.ollama
    vectors = await ollama.embed(
        [f"search_document: {chunk['text']}" for chunk in chunks],
        model=settings.ollama_embed_model,
    )

    try:
        result = await asyncio.to_thread(store.add_document, source, chunks, vectors)
    except StoreModelMismatch as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    # Counts and timings only; the filename stays out of the log
    # (THREAT_MODEL.md logging policy).
    logger.info(
        "Indexed document: %d chunks, %s pages, %.0f ms, replaced=%s",
        len(chunks),
        pages if pages is not None else "-",
        (time.perf_counter() - started) * 1000,
        result["replaced"],
    )
    return {
        "source": source,
        "chunks": result["chunks"],
        "pages": pages,
        "replaced": result["replaced"],
    }


@router.get("")
async def list_documents(request: Request):
    store = _get_store(request)
    return {"documents": await asyncio.to_thread(store.list_documents)}


@router.get("/stats")
async def document_stats(request: Request):
    store = _get_store(request)
    return await asyncio.to_thread(store.stats)


@router.delete("")
async def clear_documents(request: Request):
    store = _get_store(request)
    await asyncio.to_thread(store.clear)
    logger.info("Library cleared")
    return {"cleared": True}


@router.delete("/{source}")
async def delete_document(source: str, request: Request):
    store = _get_store(request)
    deleted = await asyncio.to_thread(store.delete_source, source)
    if not deleted:
        raise HTTPException(status_code=404, detail="No such document.")
    logger.info("Deleted one document")
    return {"deleted": source}
