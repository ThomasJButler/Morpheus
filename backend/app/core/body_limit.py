"""ASGI middleware that caps the request body size before anything buffers it.

Ported from isq-agent (rag-service/app/core/body_limit.py, MIT, same author),
with one change for current FastAPI: the mid-stream overflow raises
starlette's HTTPException(413) instead of a private exception. FastAPI wraps
any other exception raised during body parsing into a 400 "There was an
error parsing the body" (fastapi/routing.py), and HTTPException is the one
thing its wrapper re-raises, so 413 survives to the client.

Why this isn't done in the endpoint: Starlette's multipart parser spools file
parts with no size cap of its own (max_part_size only guards non-file
parts), and FastAPI fully parses the body before the handler runs. A size
check inside the upload route would execute after the whole upload was
buffered. Enforcing it here, on the raw ASGI receive stream:
  - an honest Content-Length over the cap is refused before reading a byte;
  - a body without Content-Length (chunked transfer) is metered as it
    streams and refused the moment the running total crosses the limit.

The limit is read live from settings on each request, so tests can vary it
without a restart.
"""

import json

from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import get_settings


def _detail() -> str:
    return f"Request body too large; the limit is {get_settings().max_upload_mb} MB."


def _content_length(scope: Scope) -> int | None:
    for name, value in scope.get("headers", []):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


async def _send_413(send: Send) -> None:
    body = json.dumps({"detail": _detail()}).encode()
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


class MaxBodySizeMiddleware:
    """Reject any HTTP request whose body exceeds settings.max_upload_mb.

    Sits inside CORS (so the 413 still carries CORS headers) and outside the
    exception middleware (which renders the mid-stream HTTPException)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        max_bytes = get_settings().max_upload_bytes

        # Fast path: an honest oversized Content-Length is refused before the
        # app is ever invoked, so the response is sent directly from here.
        declared = _content_length(scope)
        if declared is not None and declared > max_bytes:
            await _send_413(send)
            return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > max_bytes:
                    raise HTTPException(status_code=413, detail=_detail())
            return message

        await self.app(scope, limited_receive, send)
