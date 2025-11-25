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

from app.models.chat import ChatRequest, ChatResponse, StreamChunk
from app.rag.simple import SimpleRAG

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

# Initialize RAG pipeline (simple semantic search only)
rag_pipeline = SimpleRAG()


async def stream_response(
    user_message: str,
) -> AsyncGenerator[str, None]:
    """
    Generate streaming response in SSE format.

    Args:
        user_message: The user's message text

    Yields:
        str: SSE-formatted events
    """
    try:
        # Stream chunks from simple RAG
        async for chunk in rag_pipeline.process_query_streaming(user_message):
            # SSE format requires "data: " prefix and double newline separator
            chunk_json = chunk.model_dump_json()
            yield f"data: {chunk_json}\n\n"

        # Send completion marker for successful streams
        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        error_chunk = StreamChunk(type="error", content=str(e))
        yield f"data: {error_chunk.model_dump_json()}\n\n"
        # Ensure stream ends properly even on error
        yield "data: [DONE]\n\n"


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint with optional streaming.
    Supports both single message format and Vercel AI SDK messages array format.

    Args:
        request: Chat request containing message or messages array

    Returns:
        StreamingResponse or ChatResponse depending on stream parameter
    """
    # Extract user message from either format
    user_message = None

    if request.messages:
        # Vercel AI SDK format: extract last user message
        for msg in reversed(request.messages):
            if msg.get("role") == "user":
                user_message = msg.get("content")
                break
    elif request.message:
        # Legacy format
        user_message = request.message

    # Validate message
    if not user_message or not user_message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    logger.info(
        f"Chat request - Stream: {request.stream}, "
        f"Message length: {len(user_message)}"
    )

    try:
        # Streaming response
        if request.stream:
            return EventSourceResponse(
                stream_response(user_message),
                media_type="text/event-stream",
            )

        # Non-streaming response
        else:
            # Process query
            response_text, citations, metrics = await rag_pipeline.process_query(
                user_message
            )

            # Create response
            response = ChatResponse(
                message=response_text,
                citations=citations,
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


@router.post("/context")
async def get_context(request: dict):
    """
    Get citations/context for a query (used after streaming completes).
    Similar to pinecone-vercel-starter pattern.

    Args:
        request: Dict containing 'query' string

    Returns:
        dict: Citations for the query
    """
    try:
        query = request.get("query", "")
        if not query:
            # If no query, try to get last message from messages array
            messages = request.get("messages", [])
            if messages:
                query = messages[-1].get("content", "")

        if not query:
            return {"citations": [], "message": "No query provided"}

        logger.info(f"Context request for query: {query[:50]}...")

        # Retrieve context using RAG pipeline
        _, citations, _ = await rag_pipeline.process_query(query)

        return {
            "citations": [c.dict() for c in citations],
            "count": len(citations)
        }

    except Exception as e:
        logger.error(f"Context endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/info")
async def info():
    """
    Get Morpheus RAG information.

    Returns:
        dict: System information and capabilities
    """
    return {
        "name": "Morpheus RAG",
        "description": "Semantic search powered RAG - Upload docs, ask questions, reveal truth",
        "version": "2.0-simplified",
        "features": [
            "Document upload (PDF, TXT, MD, DOCX)",
            "Semantic search with OpenAI embeddings",
            "Claude-powered responses",
            "Source citations",
            "Matrix-themed interface"
        ],
        "status": "operational"
    }
