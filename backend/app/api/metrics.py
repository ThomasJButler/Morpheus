"""
Metrics API for performance monitoring and health checks.

Provides endpoints for health checks and session management.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.rag.simple import SimpleRAG
from app.utils.session import get_session_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


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
            "sessions_removed": stats_before["total_sessions"]
            - stats_after["total_sessions"],
        }

    except Exception as e:
        logger.error(f"Session cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


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
