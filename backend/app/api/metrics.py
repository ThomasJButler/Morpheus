"""
Metrics API for performance monitoring and A/B testing.

Provides endpoints for comparing RAG modes, tracking performance,
and gathering insights for optimization.
"""

import asyncio
import logging
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Query

from app.models.chat import RAGMode, RetrievalMetrics
from app.rag.agentic import AgenticRAG
from app.rag.hybrid import HybridRAG
from app.rag.simple import SimpleRAG
from app.utils.session import get_session_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/compare")
async def compare_rag_modes(
    query: str = Query(..., description="Test query for comparison"),
    include_agentic: bool = Query(default=False, description="Include agentic mode (slower)"),
):
    """
    Compare performance of different RAG modes on the same query.

    Runs the query through multiple RAG pipelines and returns
    comparative metrics for analysis.

    Args:
        query: Query to test across modes
        include_agentic: Whether to include agentic mode (slower)

    Returns:
        dict: Comparative results for each mode
    """
    logger.info(f"Running RAG mode comparison for query: {query}")

    try:
        # Initialise RAG pipelines
        simple_rag = SimpleRAG()
        hybrid_rag = HybridRAG()

        results = {}

        # Run simple mode
        try:
            simple_response, simple_citations, simple_metrics = await simple_rag.process_query(query)
            results["simple"] = {
                "mode": RAGMode.SIMPLE,
                "response_length": len(simple_response),
                "num_citations": len(simple_citations),
                "metrics": simple_metrics.model_dump(),
                "success": True,
            }
        except Exception as e:
            logger.error(f"Simple mode failed: {e}")
            results["simple"] = {
                "mode": RAGMode.SIMPLE,
                "success": False,
                "error": str(e),
            }

        # Run hybrid mode
        try:
            hybrid_response, hybrid_citations, hybrid_metrics = await hybrid_rag.process_query(query)
            results["hybrid"] = {
                "mode": RAGMode.HYBRID,
                "response_length": len(hybrid_response),
                "num_citations": len(hybrid_citations),
                "metrics": hybrid_metrics.model_dump(),
                "success": True,
            }
        except Exception as e:
            logger.error(f"Hybrid mode failed: {e}")
            results["hybrid"] = {
                "mode": RAGMode.HYBRID,
                "success": False,
                "error": str(e),
            }

        # Optionally run agentic mode
        if include_agentic:
            try:
                agentic_rag = AgenticRAG()
                agentic_response, agentic_citations, agentic_metrics = await agentic_rag.process_query(query)
                results["agentic"] = {
                    "mode": RAGMode.AGENTIC,
                    "response_length": len(agentic_response),
                    "num_citations": len(agentic_citations),
                    "metrics": agentic_metrics.model_dump(),
                    "success": True,
                }
            except Exception as e:
                logger.error(f"Agentic mode failed: {e}")
                results["agentic"] = {
                    "mode": RAGMode.AGENTIC,
                    "success": False,
                    "error": str(e),
                }

        # Calculate comparative metrics
        successful_modes = [k for k, v in results.items() if v.get("success")]

        comparison = {
            "query": query,
            "results": results,
            "summary": {
                "fastest_mode": _find_fastest_mode(results),
                "most_citations": _find_most_citations(results),
                "modes_tested": len(results),
                "successful_modes": len(successful_modes),
            },
        }

        return comparison

    except Exception as e:
        logger.error(f"Comparison failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Comparison error: {str(e)}")


@router.get("/sessions")
async def get_session_metrics():
    """
    Get statistics about active sessions.

    Returns:
        dict: Session statistics
    """
    try:
        manager = get_session_manager()
        stats = manager.get_session_stats()

        return {
            "success": True,
            "stats": stats,
        }

    except Exception as e:
        logger.error(f"Session metrics failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/sessions/cleanup")
async def cleanup_expired_sessions():
    """
    Manually trigger cleanup of expired sessions.

    Returns:
        dict: Cleanup results
    """
    try:
        manager = get_session_manager()

        # Get stats before cleanup
        stats_before = manager.get_session_stats()

        # Run cleanup
        manager.cleanup_expired_sessions()

        # Get stats after cleanup
        stats_after = manager.get_session_stats()

        return {
            "success": True,
            "sessions_before": stats_before["total_sessions"],
            "sessions_after": stats_after["total_sessions"],
            "sessions_removed": stats_before["total_sessions"] - stats_after["total_sessions"],
        }

    except Exception as e:
        logger.error(f"Session cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/performance")
async def get_performance_stats(
    query: str = Query(..., description="Test query"),
    iterations: int = Query(default=3, ge=1, le=10, description="Number of iterations"),
):
    """
    Run performance benchmarks on a query.

    Executes query multiple times to get average performance metrics.

    Args:
        query: Query to benchmark
        iterations: Number of iterations to run

    Returns:
        dict: Performance statistics
    """
    logger.info(f"Running performance benchmark: {query} ({iterations} iterations)")

    try:
        hybrid_rag = HybridRAG()

        timings = []
        result_counts = []
        citation_counts = []

        for i in range(iterations):
            logger.info(f"Benchmark iteration {i + 1}/{iterations}")

            response, citations, metrics = await hybrid_rag.process_query(query)

            timings.append(metrics.query_time_ms)
            result_counts.append(metrics.num_results)
            citation_counts.append(len(citations))

        # Calculate statistics
        avg_time = sum(timings) / len(timings)
        min_time = min(timings)
        max_time = max(timings)
        avg_results = sum(result_counts) / len(result_counts)
        avg_citations = sum(citation_counts) / len(citation_counts)

        return {
            "success": True,
            "query": query,
            "iterations": iterations,
            "performance": {
                "average_time_ms": round(avg_time, 2),
                "min_time_ms": round(min_time, 2),
                "max_time_ms": round(max_time, 2),
                "average_results": round(avg_results, 2),
                "average_citations": round(avg_citations, 2),
            },
            "raw_timings": [round(t, 2) for t in timings],
        }

    except Exception as e:
        logger.error(f"Performance benchmark failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Benchmark error: {str(e)}")


@router.get("/health-detailed")
async def detailed_health_check():
    """
    Detailed health check with component status.

    Tests connectivity to all services and returns detailed status.

    Returns:
        dict: Detailed health information
    """
    from app.core.pinecone_client import get_pinecone_client

    health = {
        "overall_status": "healthy",
        "components": {},
    }

    # Check Pinecone
    try:
        pc_client = get_pinecone_client()
        index_stats = pc_client.index_stats()
        health["components"]["pinecone"] = {
            "status": "healthy",
            "stats": index_stats,
        }
    except Exception as e:
        logger.error(f"Pinecone health check failed: {e}")
        health["components"]["pinecone"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health["overall_status"] = "degraded"

    # Check session manager
    try:
        manager = get_session_manager()
        stats = manager.get_session_stats()
        health["components"]["sessions"] = {
            "status": "healthy",
            "stats": stats,
        }
    except Exception as e:
        logger.error(f"Session manager health check failed: {e}")
        health["components"]["sessions"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health["overall_status"] = "degraded"

    # Check RAG pipelines
    try:
        simple_rag = SimpleRAG()
        health["components"]["rag_simple"] = {
            "status": "healthy",
        }
    except Exception as e:
        logger.error(f"Simple RAG initialization failed: {e}")
        health["components"]["rag_simple"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health["overall_status"] = "degraded"

    return health


# Helper functions
def _find_fastest_mode(results: Dict) -> str:
    """Find the fastest mode from results."""
    fastest = None
    min_time = float("inf")

    for mode, data in results.items():
        if data.get("success") and "metrics" in data:
            time_ms = data["metrics"].get("query_time_ms", float("inf"))
            if time_ms < min_time:
                min_time = time_ms
                fastest = mode

    return fastest or "N/A"


def _find_most_citations(results: Dict) -> str:
    """Find mode with most citations."""
    most = None
    max_citations = 0

    for mode, data in results.items():
        if data.get("success"):
            num_citations = data.get("num_citations", 0)
            if num_citations > max_citations:
                max_citations = num_citations
                most = mode

    return most or "N/A"
