"""
Chat API endpoints with streaming support.
Handles RAG queries and returns responses with citations.
"""

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.models.chat import ChatRequest, ChatResponse, RAGMode, StreamChunk
from app.rag.simple import SimpleRAG
from app.rag.hybrid import HybridRAG

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

# Initialise RAG pipelines
simple_rag = SimpleRAG()
hybrid_rag = HybridRAG()

# Import agentic RAG (lazy import to avoid circular dependencies)
_agentic_rag = None


def get_agentic_rag():
    """Get or create agentic RAG instance."""
    global _agentic_rag
    if _agentic_rag is None:
        from app.rag.agentic import AgenticRAG
        _agentic_rag = AgenticRAG()
    return _agentic_rag


async def stream_response(
    request: ChatRequest,
) -> AsyncGenerator[str, None]:
    """
    Generate streaming response in SSE format.

    Args:
        request: Chat request

    Yields:
        str: SSE-formatted events
    """
    try:
        # Route to appropriate RAG pipeline
        if request.mode == RAGMode.SIMPLE:
            rag_pipeline = simple_rag
        elif request.mode in [RAGMode.HYBRID, RAGMode.CASCADING]:
            rag_pipeline = hybrid_rag
        elif request.mode == RAGMode.AGENTIC:
            rag_pipeline = get_agentic_rag()
            logger.info("Using agentic RAG with tool use capability")
        else:
            logger.warning(f"Unknown mode {request.mode}, using simple mode")
            rag_pipeline = simple_rag

        # Stream chunks
        async for chunk in rag_pipeline.process_query_streaming(request.message):
            # Serialize chunk to JSON
            chunk_json = chunk.model_dump_json()
            yield f"data: {chunk_json}\n\n"

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        error_chunk = StreamChunk(type="error", content=str(e))
        yield f"data: {error_chunk.model_dump_json()}\n\n"


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint with optional streaming.

    Args:
        request: Chat request containing message and options

    Returns:
        StreamingResponse or ChatResponse depending on stream parameter
    """
    logger.info(
        f"Chat request - Mode: {request.mode}, Stream: {request.stream}, "
        f"Message length: {len(request.message)}"
    )

    # Validate request
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # Streaming response
        if request.stream:
            return EventSourceResponse(
                stream_response(request),
                media_type="text/event-stream",
            )

        # Non-streaming response
        else:
            if request.mode == RAGMode.SIMPLE:
                rag_pipeline = simple_rag
            elif request.mode in [RAGMode.HYBRID, RAGMode.CASCADING]:
                rag_pipeline = hybrid_rag
            elif request.mode == RAGMode.AGENTIC:
                rag_pipeline = get_agentic_rag()
                logger.info("Using agentic RAG with tool use capability")
            else:
                logger.warning(f"Unknown mode {request.mode}, using simple mode")
                rag_pipeline = simple_rag

            # Process query
            response_text, citations, metrics = await rag_pipeline.process_query(
                request.message
            )

            # Create response
            response = ChatResponse(
                message=response_text,
                citations=citations,
                mode=request.mode,
                metrics=metrics,
                session_id=request.session_id,
            )

            logger.info(
                f"Response generated - Citations: {len(citations)}, "
                f"Metrics: {metrics.query_time_ms:.2f}ms"
            )

            return response

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        dict: Service health status
    """
    try:
        from app.core.pinecone_client import get_pinecone_client

        # Check Pinecone connection
        pc_client = get_pinecone_client()
        index_stats = pc_client.index_stats()

        return {
            "status": "healthy",
            "pinecone_connected": True,
            "index_stats": index_stats,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "pinecone_connected": False,
            "error": str(e),
        }


@router.get("/modes")
async def list_modes():
    """
    List available RAG modes.

    Returns:
        dict: Available modes and their descriptions
    """
    return {
        "modes": [
            {
                "name": RAGMode.SIMPLE,
                "description": "Basic semantic search with direct retrieval",
                "status": "available",
            },
            {
                "name": RAGMode.HYBRID,
                "description": "Hybrid search combining dense and sparse retrieval (+48% performance)",
                "status": "available",
            },
            {
                "name": RAGMode.CASCADING,
                "description": "Cascading retrieval with reranking (same as hybrid)",
                "status": "available",
            },
            {
                "name": RAGMode.AGENTIC,
                "description": "Agentic RAG with Claude tool use - intelligent retrieval decisions",
                "status": "available",
            },
        ]
    }
