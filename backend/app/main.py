"""
FastAPI application entry point.
RAG Chatbot backend with streaming support and multiple retrieval modes.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.metrics import router as metrics_router
from app.core.config import settings
from app.core.pinecone_client import get_pinecone_client

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        # Uncomment to enable file logging
        # logging.FileHandler(settings.log_file)
    ],
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.

    Args:
        app: FastAPI application instance
    """
    # Startup
    logger.info("Starting RAG Chatbot backend...")

    try:
        # Initialize Pinecone connection
        pc_client = get_pinecone_client()
        stats = pc_client.index_stats()
        logger.info(f"Pinecone connected - Index stats: {stats}")
    except Exception as e:
        logger.error(f"Failed to initialize Pinecone: {e}")
        raise

    logger.info("Backend started successfully")

    yield

    # Shutdown
    logger.info("Shutting down RAG Chatbot backend...")


# Create FastAPI app
app = FastAPI(
    title="RAG Chatbot API",
    description="Advanced RAG chatbot with multiple retrieval modes and streaming support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors.

    Args:
        request: FastAPI request
        exc: Exception

    Returns:
        JSONResponse: Error response
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.debug else "An error occurred",
        },
    )


# Explicit OPTIONS handler for preflight requests
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    """
    Handle OPTIONS preflight requests explicitly.

    Args:
        rest_of_path: The path being requested

    Returns:
        JSONResponse: Empty response with CORS headers
    """
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400",  # Cache preflight for 24 hours
        }
    )


# Include routers
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(metrics_router)


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint with API information.

    Returns:
        dict: API info
    """
    return {
        "name": "RAG Chatbot API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": {
            "chat": "POST /api/chat",
            "modes": "GET /api/modes",
            "health": "GET /api/health",
            "upload": "POST /api/documents/upload",
            "document_stats": "GET /api/documents/stats",
            "metrics_compare": "GET /api/metrics/compare",
            "metrics_sessions": "GET /api/metrics/sessions",
            "metrics_performance": "GET /api/metrics/performance",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
    )
