"""The chat endpoint: SSE stream of mode, token, citation and done events.

Errors inside the stream become a single `error` event with a code and a
hint, never a traceback (SECURITY_REVIEW F8), followed by [DONE] so the
client always sees a terminated stream.
"""

import logging

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.api.documents import _get_store
from app.core.config import get_settings
from app.core.ollama import OllamaError
from app.core.rate_limit import limiter
from app.models.chat import ChatRequest, StreamEvent
from app.rag.pipeline import answer_stream

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
@limiter.limit(lambda: get_settings().rate_limit)
async def chat(request: Request, body: ChatRequest):
    settings = get_settings()
    store = _get_store(request)
    ollama = request.app.state.ollama

    async def generator():
        try:
            async for event in answer_stream(
                body, ollama=ollama, store=store, settings=settings
            ):
                yield {"data": event.sse()}
        except OllamaError as exc:
            message = exc.message + (f" ({exc.hint})" if exc.hint else "")
            yield {"data": StreamEvent(type="error", code=exc.code, message=message).sse()}
        except Exception:
            logger.exception("Chat stream failed")
            yield {
                "data": StreamEvent(
                    type="error", code="internal_error", message="Internal server error."
                ).sse()
            }
        yield {"data": "[DONE]"}

    return EventSourceResponse(generator())
