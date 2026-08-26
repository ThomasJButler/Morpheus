"""ASGI middleware that caps the request body size before anything buffers it.

Ported from isq-agent (rag-service/app/core/body_limit.py, MIT, same author).

Why this isn't done in the endpoint: Starlette's multipart parser writes an
uploaded file part to a SpooledTemporaryFile with no size limit of its own,
and FastAPI fully parses the body before the handler runs. A size check inside
the upload route therefore executes only after the whole upload has been
buffered. Enforcing the cap here, on the raw ASGI receive stream, rejects an
oversized body before the parser touches it:
  - an honest Content-Length over the cap is refused before reading a byte;
  - a body without Content-Length (chunked transfer) is metered as it streams
    and cut off with 413 the moment the running total crosses the limit.

The limit is read live from settings on each request, so tests can vary it
without a restart.
"""

import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import get_settings


class _BodyTooLarge(Exception):
    """Internal signal: the streamed body crossed the cap mid-read."""


def _content_length(scope: Scope) -> int | None:
    for name, value in scope.get("headers", []):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


async def _send_413(send: Send) -> None:
    detail = f"Request body too large; the limit is {get_settings().max_upload_mb} MB."
    body = json.dumps({"detail": detail}).encode()
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
    exception middleware (so the streamed-overflow signal is caught here, not
    turned into a 500)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        max_bytes = get_settings().max_upload_bytes

        declared = _content_length(scope)
        if declared is not None and declared > max_bytes:
            await _send_413(send)
            return

        received = 0
        response_started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > max_bytes:
                    raise _BodyTooLarge
            return message

        async def guarded_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, guarded_send)
        except _BodyTooLarge:
            if response_started:
                raise
            await _send_413(send)
