"""Talk to Ollama over plain HTTP.

Three endpoints (embed, chat, tags) plus version/show. Not worth an SDK, and
a dependency-free client keeps the egress surface auditable: every request in
this file goes to one base URL, loopback by default.

Errors map to three exception types so routes can answer with a status code
and a hint (`ollama pull ...`) instead of a traceback. The client never
substitutes a different model for the one asked for: a missing model is an
error, because a silent downgrade is a lie about what produced the answer.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx


class OllamaError(Exception):
    code = "ollama_error"
    status = 502

    def __init__(self, message: str, hint: str | None = None):
        super().__init__(message)
        self.message = message
        self.hint = hint


class OllamaUnavailable(OllamaError):
    code = "ollama_unavailable"
    status = 503


class ModelMissing(OllamaError):
    code = "model_missing"
    status = 503


def normalise_model_name(name: str) -> str:
    """`nomic-embed-text` and `nomic-embed-text:latest` are the same model."""
    return name if ":" in name else f"{name}:latest"


class OllamaClient:
    def __init__(
        self,
        base_url: str,
        *,
        connect_timeout: float = 3.0,
        read_timeout: float = 180.0,
        keep_alive: str = "15m",
        embed_batch_size: int = 32,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.keep_alive = keep_alive
        self.embed_batch_size = max(1, embed_batch_size)
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(
                connect=connect_timeout,
                read=read_timeout,
                write=30.0,
                pool=connect_timeout,
            ),
            transport=transport,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    # -- error mapping ------------------------------------------------------

    def _unavailable(self, exc: Exception) -> OllamaUnavailable:
        return OllamaUnavailable(
            f"Ollama is not reachable at {self.base_url}",
            hint="Start Ollama (`ollama serve`) and try again.",
        )

    def _map_http_error(self, status_code: int, body: str, model: str | None, path: str) -> OllamaError:
        if status_code == 404 and "not found" in body.lower() and model:
            return ModelMissing(
                f"Model {model!r} is not installed",
                hint=f"ollama pull {model}",
            )
        return OllamaError(f"Ollama returned {status_code} on {path}: {body[:200]}")

    async def _request(self, method: str, path: str, *, model: str | None = None, **kw) -> httpx.Response:
        try:
            resp = await self._client.request(method, path, **kw)
        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            raise self._unavailable(exc) from exc
        except httpx.TimeoutException as exc:
            raise OllamaError(f"Ollama timed out on {path}") from exc
        except httpx.TransportError as exc:
            raise self._unavailable(exc) from exc
        if resp.status_code >= 400:
            raise self._map_http_error(resp.status_code, resp.text, model, path)
        return resp

    # -- discovery ----------------------------------------------------------

    async def version(self) -> str:
        resp = await self._request("GET", "/api/version")
        return resp.json().get("version", "unknown")

    async def list_models(self) -> list[dict]:
        resp = await self._request("GET", "/api/tags")
        return resp.json().get("models", [])

    async def show(self, name: str) -> dict:
        resp = await self._request("POST", "/api/show", model=name, json={"model": name})
        return resp.json()

    async def installed_models(self) -> set[str]:
        return {normalise_model_name(m.get("name", "")) for m in await self.list_models()}

    # -- embeddings ----------------------------------------------------------

    async def embed(self, texts: list[str], *, model: str) -> list[list[float]]:
        """Embed texts in batches. Callers add task prefixes themselves
        (nomic wants `search_document: ` / `search_query: `)."""
        out: list[list[float]] = []
        for i in range(0, len(texts), self.embed_batch_size):
            batch = texts[i : i + self.embed_batch_size]
            resp = await self._request(
                "POST",
                "/api/embed",
                model=model,
                json={"model": model, "input": batch, "keep_alive": self.keep_alive},
            )
            embeddings = resp.json().get("embeddings")
            if not isinstance(embeddings, list) or len(embeddings) != len(batch):
                raise OllamaError("Ollama returned an unexpected /api/embed payload")
            out.extend(embeddings)
        return out

    # -- chat ----------------------------------------------------------------

    async def chat_stream(
        self,
        messages: list[dict],
        *,
        model: str,
        temperature: float,
        num_ctx: int,
        max_tokens: int,
        think: bool = False,
    ) -> AsyncIterator[dict[str, Any]]:
        """Yields {"type": "token", "content": str} events then one
        {"type": "done", "stats": {...}}."""
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            # Thinking off for latency; any <think> block that leaks anyway is
            # stripped by the citation validator.
            "think": think,
            "keep_alive": self.keep_alive,
            "options": {
                "temperature": temperature,
                "num_ctx": num_ctx,
                "num_predict": max_tokens,
            },
        }
        try:
            async with self._client.stream("POST", "/api/chat", json=payload) as resp:
                if resp.status_code >= 400:
                    body = (await resp.aread()).decode(errors="replace")
                    raise self._map_http_error(resp.status_code, body, model, "/api/chat")
                async for line in resp.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    data = json.loads(line)
                    if data.get("error"):
                        raise OllamaError(f"Ollama error mid-stream: {str(data['error'])[:200]}")
                    content = (data.get("message") or {}).get("content") or ""
                    if content:
                        yield {"type": "token", "content": content}
                    if data.get("done"):
                        yield {
                            "type": "done",
                            "stats": {
                                key: data.get(key)
                                for key in (
                                    "prompt_eval_count",
                                    "eval_count",
                                    "total_duration",
                                    "load_duration",
                                    "eval_duration",
                                    "done_reason",
                                )
                            },
                        }
        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            raise self._unavailable(exc) from exc
        except httpx.TimeoutException as exc:
            raise OllamaError("Ollama timed out on /api/chat") from exc
        except httpx.TransportError as exc:
            raise self._unavailable(exc) from exc

    async def chat(self, messages: list[dict], *, model: str, temperature: float, num_ctx: int, max_tokens: int) -> str:
        """Non-streaming helper (deep mode uses it for sub-question drafting)."""
        parts: list[str] = []
        async for event in self.chat_stream(
            messages,
            model=model,
            temperature=temperature,
            num_ctx=num_ctx,
            max_tokens=max_tokens,
        ):
            if event["type"] == "token":
                parts.append(event["content"])
        return "".join(parts)
