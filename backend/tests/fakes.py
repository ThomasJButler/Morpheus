"""Test doubles.

FakeOllama embeds with feature hashing, so texts sharing words get similar
vectors. That is enough for retrieval tests to be meaningful with no model
and no network.
"""

import hashlib
import math
import re

from app.core.ollama import ModelMissing, OllamaUnavailable, normalise_model_name

DIM = 64


def fake_embed(text: str, dim: int = DIM) -> list[float]:
    vec = [0.0] * dim
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        bucket = int(hashlib.sha256(token.encode()).hexdigest(), 16) % dim
        vec[bucket] += 1.0
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


class FakeOllama:
    def __init__(
        self,
        models: tuple[str, ...] = ("qwen3.5:9b", "nomic-embed-text:latest"),
        version: str = "0.32.6",
        answer: str = "",
        unavailable: bool = False,
        dim: int = DIM,
    ):
        self.models = list(models)
        self.answer = answer
        self.unavailable = unavailable
        self.dim = dim
        self._version = version
        self.embed_calls: list[list[str]] = []
        self.chat_calls: list[dict] = []

    def _check(self):
        if self.unavailable:
            raise OllamaUnavailable(
                "Ollama is not reachable at http://127.0.0.1:11434",
                hint="Start Ollama (`ollama serve`) and try again.",
            )

    def _require(self, model: str):
        if normalise_model_name(model) not in {normalise_model_name(n) for n in self.models}:
            raise ModelMissing(f"Model {model!r} is not installed", hint=f"ollama pull {model}")

    async def version(self) -> str:
        self._check()
        return self._version

    async def list_models(self) -> list[dict]:
        self._check()
        out = []
        for name in self.models:
            family = "nomic-bert" if "embed" in name else "qwen3"
            out.append(
                {
                    "name": name,
                    "size": 1_000_000,
                    "details": {"family": family, "parameter_size": "9B"},
                }
            )
        return out

    async def show(self, name: str) -> dict:
        self._check()
        caps = ["embedding"] if "embed" in name else ["completion", "tools"]
        return {"capabilities": caps}

    async def installed_models(self) -> set[str]:
        return {normalise_model_name(m["name"]) for m in await self.list_models()}

    async def embed(self, texts: list[str], *, model: str) -> list[list[float]]:
        self._check()
        self._require(model)
        self.embed_calls.append(list(texts))
        return [fake_embed(t, self.dim) for t in texts]

    async def chat_stream(self, messages: list[dict], *, model: str, **kw):
        self._check()
        self._require(model)
        self.chat_calls.append({"messages": messages, "model": model, **kw})
        text = self.answer
        for i in range(0, len(text), 4):
            yield {"type": "token", "content": text[i : i + 4]}
        yield {
            "type": "done",
            "stats": {
                "prompt_eval_count": 10,
                "eval_count": max(1, len(text) // 4),
                "done_reason": "stop",
            },
        }

    async def chat(self, messages: list[dict], *, model: str, **kw) -> str:
        parts = []
        async for event in self.chat_stream(messages, model=model, **kw):
            if event["type"] == "token":
                parts.append(event["content"])
        return "".join(parts)

    async def aclose(self):
        pass
