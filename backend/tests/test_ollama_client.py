import json

import httpx
import pytest

from app.core.ollama import (
    ModelMissing,
    OllamaClient,
    OllamaError,
    OllamaUnavailable,
    normalise_model_name,
)


def make_client(handler, **kw) -> OllamaClient:
    return OllamaClient(
        "http://127.0.0.1:11434", transport=httpx.MockTransport(handler), **kw
    )


def test_normalise_model_name():
    assert normalise_model_name("nomic-embed-text") == "nomic-embed-text:latest"
    assert normalise_model_name("qwen3.5:9b") == "qwen3.5:9b"


async def test_embed_batches_and_orders():
    batch_sizes = []

    def handler(request):
        body = json.loads(request.content)
        batch_sizes.append(len(body["input"]))
        return httpx.Response(
            200, json={"embeddings": [[float(len(t))] for t in body["input"]]}
        )

    client = make_client(handler, embed_batch_size=2)
    out = await client.embed(["a", "bb", "ccc"], model="nomic-embed-text")
    assert batch_sizes == [2, 1]
    assert out == [[1.0], [2.0], [3.0]]


async def test_chat_stream_parses_ndjson():
    lines = [
        {"message": {"role": "assistant", "content": "Hel"}, "done": False},
        {"message": {"role": "assistant", "content": "lo"}, "done": False},
        {"done": True, "done_reason": "stop", "eval_count": 2, "prompt_eval_count": 5},
    ]

    def handler(request):
        content = "".join(json.dumps(line) + "\n" for line in lines)
        return httpx.Response(200, content=content.encode())

    client = make_client(handler)
    events = [
        e
        async for e in client.chat_stream(
            [{"role": "user", "content": "hi"}],
            model="m",
            temperature=0.2,
            num_ctx=1024,
            max_tokens=16,
        )
    ]
    tokens = "".join(e["content"] for e in events if e["type"] == "token")
    assert tokens == "Hello"
    assert events[-1]["type"] == "done"
    assert events[-1]["stats"]["eval_count"] == 2


async def test_connect_error_maps_to_unavailable():
    def handler(request):
        raise httpx.ConnectError("connection refused")

    client = make_client(handler)
    with pytest.raises(OllamaUnavailable) as exc:
        await client.version()
    assert "ollama serve" in (exc.value.hint or "")


async def test_missing_model_maps_with_pull_hint():
    def handler(request):
        return httpx.Response(
            404, json={"error": 'model "nope" not found, try pulling it first'}
        )

    client = make_client(handler)
    with pytest.raises(ModelMissing) as exc:
        await client.embed(["x"], model="nope")
    assert exc.value.hint == "ollama pull nope"


async def test_stream_error_line_raises():
    def handler(request):
        return httpx.Response(200, content=b'{"error": "boom"}\n')

    client = make_client(handler)
    with pytest.raises(OllamaError):
        [
            e
            async for e in client.chat_stream(
                [], model="m", temperature=0.0, num_ctx=8, max_tokens=1
            )
        ]


async def test_bad_embed_payload_raises():
    def handler(request):
        return httpx.Response(200, json={"embeddings": "wat"})

    client = make_client(handler)
    with pytest.raises(OllamaError):
        await client.embed(["x"], model="m")
