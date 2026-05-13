"""
Chat API endpoints with streaming support.
Handles RAG queries and returns responses with citations.
Supports tiered RAG modes: Simple, Hybrid, Agentic, and Auto.
"""

import json
import logging
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.models.chat import (
    ChatRequest,
    ChatResponse,
    QueryAnalysis,
    RAGMode,
    StreamChunk,
)
from app.rag import get_orchestrator, QueryAnalyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

# Initialize RAG orchestrator (manages all RAG modes)
orchestrator = get_orchestrator()

# Query analyzer for standalone analysis
query_analyzer = QueryAnalyzer()

# Default namespace for backwards compatibility
DEFAULT_NAMESPACE = "default"


async def stream_response(
    user_message: str,
    namespace: str = DEFAULT_NAMESPACE,
    mode: RAGMode = RAGMode.AUTO,
    deep_mode: bool = False,
    return_analysis: bool = False,
) -> AsyncGenerator[str, None]:
    """
    Generate streaming response in SSE format.

    Args:
        user_message: The user's message text
        namespace: Pinecone namespace for session isolation
        mode: RAG mode (simple/hybrid/agentic/auto)
        deep_mode: Force agentic mode for thorough search
        return_analysis: Include query analysis in stream

    Yields:
        str: SSE-formatted events
    """
    try:
        # Stream chunks from RAG orchestrator
        async for chunk in orchestrator.process_query(
            user_message,
            mode=mode,
            namespace=namespace,
            deep_mode=deep_mode,
            return_analysis=return_analysis,
        ):
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
async def chat(
    request: ChatRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """
    Chat endpoint with optional streaming and RAG mode selection.
    Supports both single message format and Vercel AI SDK messages array format.

    Args:
        request: Chat request containing message, mode, and options
        x_session_id: Session ID for namespace isolation

    Returns:
        StreamingResponse or ChatResponse depending on stream parameter
    """
    # Use session ID as namespace, or default
    namespace = x_session_id or DEFAULT_NAMESPACE

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

    # Get RAG mode settings
    mode = request.rag_mode or RAGMode.AUTO
    deep_mode = request.deep_mode
    return_analysis = request.return_analysis

    logger.info(
        f"Chat request - Mode: {mode.value}, Deep: {deep_mode}, "
        f"Stream: {request.stream}, Namespace: {namespace}"
    )

    try:
        # Streaming response
        if request.stream:
            return EventSourceResponse(
                stream_response(
                    user_message,
                    namespace=namespace,
                    mode=mode,
                    deep_mode=deep_mode,
                    return_analysis=return_analysis,
                ),
                media_type="text/event-stream",
            )

        # Non-streaming response
        else:
            # Collect chunks from orchestrator
            response_parts = []
            citations = []
            metrics = None
            analysis = None
            mode_used = None

            async for chunk in orchestrator.process_query(
                user_message,
                mode=mode,
                namespace=namespace,
                deep_mode=deep_mode,
                return_analysis=return_analysis,
            ):
                if chunk.type == "token":
                    response_parts.append(chunk.content)
                elif chunk.type == "citation" and chunk.citation:
                    citations.append(chunk.citation)
                elif chunk.type == "done":
                    metrics = chunk.metrics
                elif chunk.type == "analysis" and chunk.analysis:
                    analysis = chunk.analysis
                elif chunk.type == "mode" and chunk.mode:
                    mode_used = chunk.mode

            response_text = "".join(response_parts)

            # Create response
            response = ChatResponse(
                message=response_text,
                citations=citations,
                metrics=metrics,
                session_id=request.session_id,
                query_analysis=analysis,
                rag_mode_used=mode_used,
            )

            logger.info(
                f"Response generated - Mode: {mode_used}, Citations: {len(citations)}"
            )

            return response

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/context")
async def get_context(
    request: dict, x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """
    Get RAG context and citations for a query.
    Used by Next.js BFF to inject context into Claude prompts.
    Returns both formatted context string AND citations.

    Now supports mode parameter for tiered retrieval.

    Args:
        request: Dict containing 'query', 'mode', and optional settings
        x_session_id: Session ID for namespace isolation

    Returns:
        dict: Formatted context, citations, metrics, and mode used
    """
    # Use session ID as namespace, or default
    namespace = x_session_id or DEFAULT_NAMESPACE

    try:
        query = request.get("query", "")
        if not query:
            # If no query, try to get last message from messages array
            messages = request.get("messages", [])
            if messages:
                query = messages[-1].get("content", "")

        if not query:
            return {"context": "", "citations": [], "count": 0}

        # Get mode settings
        mode_str = request.get("mode", "auto")
        try:
            mode = RAGMode(mode_str)
        except ValueError:
            mode = RAGMode.AUTO

        deep_mode = request.get("deep_mode", False)
        return_analysis = request.get("return_analysis", False)

        logger.info(
            f"Context request - Mode: {mode.value}, Query: {query[:50]}... "
            f"(namespace: {namespace}, return_analysis: {return_analysis})"
        )

        # Use orchestrator to get context based on mode
        contexts = []
        citations = []
        metrics = None
        analysis = None

        # Always track mode_used for frontend display
        mode_used = mode

        # Run analysis if requested (for frontend QueryInsight visualization)
        if return_analysis:
            analysis = await query_analyzer.analyze(query)
            logger.info(
                f"Query analysis: type={analysis.query_type}, complexity={analysis.complexity_score:.2f}"
            )

        # For AUTO mode, use analysis to determine actual mode
        if mode == RAGMode.AUTO:
            if not analysis:
                analysis = await query_analyzer.analyze(query)
            mode = analysis.suggested_mode
            mode_used = mode  # Update to actual routed mode
            logger.info(f"AUTO mode routed to: {mode.value}")

        # Get the appropriate RAG pipeline
        # Note: For /api/context, we're doing retrieval only, not full agentic processing
        # AgenticRAG's full power (tool use, reflection) is for /api/chat streaming endpoint
        if mode == RAGMode.SIMPLE:
            rag = orchestrator.simple_rag
        elif mode == RAGMode.HYBRID:
            rag = orchestrator.hybrid_rag
        elif mode == RAGMode.AGENTIC:
            # For context-only retrieval, agentic uses enhanced retrieval
            # but without the full agent loop (that's for /api/chat)
            rag = orchestrator.simple_rag  # Base retrieval
            logger.info("AGENTIC mode: using enhanced retrieval for context")
        else:
            rag = orchestrator.simple_rag  # Fallback

        # Retrieve context
        query_embedding = await rag.embed_query(query)

        if mode == RAGMode.HYBRID:
            contexts, metrics = await rag.retrieve_hybrid(query, namespace=namespace)
        else:
            contexts, metrics = await rag.retrieve_context(
                query_embedding, namespace=namespace
            )

        # Format context for prompt injection
        formatted_context = rag.format_context_for_prompt(contexts)

        # Create citations
        citations = rag.create_citations(contexts)

        logger.info(
            f"Context retrieved: {len(citations)} citations, mode_used: {mode_used.value}"
        )

        return {
            "context": formatted_context,
            "citations": [c.model_dump() for c in citations],
            "count": len(citations),
            "metrics": metrics.model_dump() if metrics else None,
            "mode_used": mode_used.value,
            "analysis": analysis.model_dump() if analysis else None,
        }

    except Exception as e:
        logger.error(f"Context endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-query")
async def analyze_query(request: dict):
    """
    Analyze a query without executing retrieval.
    Useful for understanding how the system will route the query.

    Args:
        request: Dict containing 'query' string

    Returns:
        QueryAnalysis with complexity, type, and recommended mode
    """
    try:
        query = request.get("query", "")
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")

        analysis = await query_analyzer.analyze(query)

        return {
            "analysis": analysis.model_dump(),
            "recommended_mode": analysis.suggested_mode.value,
            "reasoning": analysis.reasoning,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query analysis error: {e}", exc_info=True)
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
            "rag_modes": ["simple", "hybrid", "agentic", "auto"],
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
        "name": "Morpheus Ultimate RAG",
        "description": "Intelligent tiered RAG system - Upload docs, ask questions, reveal truth",
        "version": "2.0-ultimate",
        "rag_modes": {
            "simple": {
                "description": "Fast semantic search",
                "latency": "~800ms",
                "cost": "lowest",
                "accuracy": "70-80%",
            },
            "hybrid": {
                "description": "Dense + BM25 with score fusion",
                "latency": "~1200ms",
                "cost": "low",
                "accuracy": "85-90%",
            },
            "agentic": {
                "description": "Claude as autonomous research agent",
                "latency": "~2600ms",
                "cost": "moderate",
                "accuracy": "90-95%",
            },
            "auto": {
                "description": "Intelligent routing based on query analysis",
                "latency": "varies",
                "cost": "optimized",
                "accuracy": "best for query type",
            },
        },
        "features": [
            "Document upload (PDF, TXT, MD, DOCX)",
            "Tiered RAG with intelligent routing",
            "HyDE (Hypothetical Document Embeddings)",
            "Auto-escalation on low confidence",
            "Claude-powered responses",
            "Source citations with relevance scores",
            "Matrix-themed interface",
        ],
        "status": "operational",
    }
