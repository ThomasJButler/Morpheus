"""Retrieve, prompt, stream, validate.

The refusal path never calls the chat model: when nothing clears the
retrieval floor there is nothing to ground an answer in, so the fixed
refusal goes out and the model stays cold (isq-agent's deterministic
no-source path). Deep mode asks the model for up to a few standalone
sub-queries, retrieves each, and fuses across queries with the same
reciprocal rank fusion the store uses within one.
"""

import asyncio
import logging
import time
from collections.abc import AsyncIterator

from app.core.config import Settings
from app.core.ollama import (
    ModelMissing,
    OllamaClient,
    OllamaError,
    normalise_model_name,
)
from app.core.prompts import (
    REFUSAL,
    build_messages,
    build_subquery_messages,
    parse_subqueries,
)
from app.models.chat import ChatRequest, Citation, DoneInfo, StreamEvent
from app.rag.citations import CitationStreamValidator, strip_think

logger = logging.getLogger(__name__)

RRF_K = 60


async def _queries_for(
    request: ChatRequest, ollama: OllamaClient, settings: Settings, model: str
) -> list[str]:
    if not request.deep:
        return [request.message]
    try:
        raw = await ollama.chat(
            build_subquery_messages(request.message, settings.deep_max_subqueries),
            model=model,
            temperature=0.0,
            num_ctx=settings.num_ctx,
            max_tokens=200,
        )
    except OllamaError as exc:
        # Deep mode is an enhancement; a failed sub-query call degrades to a
        # normal single-query run rather than failing the whole chat.
        logger.warning("Sub-query drafting failed (%s); using the question as-is", exc.code)
        return [request.message]
    return parse_subqueries(strip_think(raw), request.message, settings.deep_max_subqueries)


def _merge(per_query: list[list[dict]], k: int) -> list[dict]:
    if len(per_query) == 1:
        return per_query[0][:k]
    fused: dict[str, float] = {}
    rows: dict[str, dict] = {}
    for results in per_query:
        for rank, row in enumerate(results, start=1):
            fused[row["id"]] = fused.get(row["id"], 0.0) + 1.0 / (RRF_K + rank)
            rows.setdefault(row["id"], row)
    if not fused:
        return []
    top = max(fused.values())
    ranked = sorted(fused.items(), key=lambda kv: kv[1], reverse=True)[:k]
    return [dict(rows[i], score=round(value / top, 4)) for i, value in ranked]


def _citation_event(index: int, hits: list[dict]) -> StreamEvent:
    hit = hits[index - 1]
    return StreamEvent(
        type="citation",
        citation=Citation(
            index=index,
            chunk_id=hit["id"],
            source=hit["source"],
            page=hit.get("page"),
            text_preview=hit["text"][:200],
            score=hit["score"],
        ),
    )


async def answer_stream(
    request: ChatRequest, *, ollama: OllamaClient, store, settings: Settings
) -> AsyncIterator[StreamEvent]:
    model = request.model or settings.ollama_chat_model
    if request.model and normalise_model_name(request.model) not in await ollama.installed_models():
        # Never substitute a different model than the one asked for.
        raise ModelMissing(
            f"Model {request.model!r} is not installed",
            hint=f"ollama pull {request.model}",
        )
    yield StreamEvent(type="mode", mode=request.mode, deep=request.deep, model=model)

    retrieval_started = time.perf_counter()
    queries = await _queries_for(request, ollama, settings, model)
    vectors = await ollama.embed(
        [f"search_query: {q}" for q in queries], model=settings.ollama_embed_model
    )
    per_query: list[list[dict]] = []
    for query, vector in zip(queries, vectors):
        hits = await asyncio.to_thread(
            store.search,
            vector=vector,
            query_text=query,
            mode=request.mode.value,
            k=settings.top_k,
            candidates=settings.candidates,
            min_vector_score=settings.min_vector_score,
        )
        per_query.append(hits)
    hits = _merge(per_query, settings.top_k)
    retrieval_ms = round((time.perf_counter() - retrieval_started) * 1000, 1)

    if not hits:
        yield StreamEvent(type="token", content=REFUSAL)
        yield StreamEvent(
            type="done",
            done=DoneInfo(
                retrieved=0,
                cited=0,
                grounded=False,
                model=model,
                mode=request.mode,
                deep=request.deep,
                retrieval_ms=retrieval_ms,
                generation_ms=0.0,
            ),
        )
        return

    generation_started = time.perf_counter()
    validator = CitationStreamValidator(len(hits))
    stats: dict = {}
    async for event in ollama.chat_stream(
        build_messages(request.message, hits),
        model=model,
        temperature=settings.temperature,
        num_ctx=settings.num_ctx,
        max_tokens=settings.max_answer_tokens,
    ):
        if event["type"] == "token":
            text, newly_cited = validator.feed(event["content"])
            for index in newly_cited:
                yield _citation_event(index, hits)
            if text:
                yield StreamEvent(type="token", content=text)
        elif event["type"] == "done":
            stats = event.get("stats") or {}
    text, newly_cited = validator.finish()
    for index in newly_cited:
        yield _citation_event(index, hits)
    if text:
        yield StreamEvent(type="token", content=text)

    yield StreamEvent(
        type="done",
        done=DoneInfo(
            retrieved=len(hits),
            cited=len(validator.cited),
            grounded=bool(validator.cited),
            model=model,
            mode=request.mode,
            deep=request.deep,
            retrieval_ms=retrieval_ms,
            generation_ms=round((time.perf_counter() - generation_started) * 1000, 1),
            prompt_tokens=stats.get("prompt_eval_count"),
            completion_tokens=stats.get("eval_count"),
        ),
    )
