"""
Document upload and processing API endpoints.
Handles file uploads, processing, chunking, embedding, and indexing.
"""

import logging
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, Header
from openai import AsyncOpenAI
from pinecone_text.sparse import BM25Encoder

from app.core.config import settings
from app.core.pinecone_client import get_pinecone_client
from app.utils.chunking import DocumentChunker
from app.utils.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Initialize services
document_processor = DocumentProcessor()
chunker = DocumentChunker()
openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
bm25_encoder = BM25Encoder()

# Default namespace for backwards compatibility
DEFAULT_NAMESPACE = "default"


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """
    Upload and process a document.

    Workflow:
    1. Validate file type and size
    2. Extract text from document
    3. Chunk text into smaller pieces
    4. Generate embeddings (dense + sparse)
    5. Index in Pinecone (within session namespace)

    Args:
        file: Uploaded file
        x_session_id: Session ID for namespace isolation

    Returns:
        dict: Processing results with document ID and stats
    """
    # Use session ID as namespace, or default
    namespace = x_session_id or DEFAULT_NAMESPACE
    logger.info(f"Received file upload: {file.filename} (namespace: {namespace})")

    # Validate file type
    file_extension = Path(file.filename).suffix.lower().lstrip(".")
    if file_extension not in settings.supported_file_types_list:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_extension}. "
            f"Supported: {', '.join(settings.supported_file_types_list)}",
        )

    # Save uploaded file temporarily
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=f".{file_extension}"
        ) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Validate file size
        if not document_processor.validate_file_size(temp_file_path):
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
            )

        # Process document
        logger.info(f"Processing document: {file.filename}")
        processed = document_processor.process_file(temp_file_path)

        if not processed["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"Document processing failed: {processed.get('error', 'Unknown error')}",
            )

        # Chunk the extracted text
        documents = processed["content"]
        chunks = chunker.chunk_documents(documents)

        logger.info(f"Chunked document into {len(chunks)} chunks")

        # Generate embeddings and index (within namespace)
        indexed_count = await index_chunks(chunks, namespace=namespace)

        # Clean up temp file
        Path(temp_file_path).unlink()

        return {
            "success": True,
            "document_id": file.filename,
            "file_type": file_extension,
            "chunks_created": len(chunks),
            "vectors_indexed": indexed_count,
            "metadata": processed["metadata"],
            "namespace": namespace,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


async def index_chunks(chunks: List[dict], namespace: str = DEFAULT_NAMESPACE) -> int:
    """
    Generate embeddings and index chunks in Pinecone.

    Args:
        chunks: List of chunk dictionaries
        namespace: Pinecone namespace for isolation

    Returns:
        int: Number of vectors indexed
    """
    if not chunks:
        return 0

    pinecone_client = get_pinecone_client()
    dense_index, sparse_index = pinecone_client.get_both_indexes()

    try:
        # Prepare texts for embedding
        texts = [chunk["text"] for chunk in chunks]

        # Generate dense embeddings (OpenAI)
        logger.info(f"Generating dense embeddings for {len(texts)} chunks")
        dense_embeddings = []

        # Batch embedding generation (OpenAI allows up to 2048 texts per request)
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            # For text-embedding-3-small, explicitly set dimensions=512
            # text-embedding-3-large uses default 1536 dimensions
            dimensions = 512 if "small" in settings.embedding_model else None
            embedding_params = {"model": settings.embedding_model, "input": batch}
            if dimensions:
                embedding_params["dimensions"] = dimensions

            response = await openai_client.embeddings.create(**embedding_params)
            dense_embeddings.extend([item.embedding for item in response.data])

        # Generate sparse embeddings (BM25)
        logger.info(f"Generating sparse embeddings for {len(texts)} chunks")
        # Fit the encoder on the current corpus before encoding
        bm25_encoder.fit(texts)
        sparse_embeddings = bm25_encoder.encode_documents(texts)

        # Prepare vectors for upsert
        dense_vectors = []
        sparse_vectors = []

        for i, chunk in enumerate(chunks):
            vector_id = f"chunk_{i}_{hash(chunk['text'])}"

            # Dense vector - build metadata without null values
            metadata = {
                "text": chunk["text"],
                "source": chunk.get("source", "unknown"),
                "chunk_index": chunk.get("chunk_index", i),
            }
            # Only add page if it's not None
            if chunk.get("page") is not None:
                metadata["page"] = chunk.get("page")

            dense_vectors.append(
                {
                    "id": vector_id,
                    "values": dense_embeddings[i],
                    "metadata": metadata,
                }
            )

            # Sparse vector
            if sparse_index and i < len(sparse_embeddings):
                sparse_vec = sparse_embeddings[i]
                # Convert to list if numpy array, otherwise use as-is
                indices = (
                    sparse_vec["indices"].tolist()
                    if hasattr(sparse_vec["indices"], "tolist")
                    else sparse_vec["indices"]
                )
                values = (
                    sparse_vec["values"].tolist()
                    if hasattr(sparse_vec["values"], "tolist")
                    else sparse_vec["values"]
                )

                # Build sparse metadata without null values
                sparse_metadata = {
                    "text": chunk["text"],
                    "source": chunk.get("source", "unknown"),
                }
                if chunk.get("page") is not None:
                    sparse_metadata["page"] = chunk.get("page")

                sparse_vectors.append(
                    {
                        "id": vector_id,
                        "sparse_values": {
                            "indices": indices,
                            "values": values,
                        },
                        "metadata": sparse_metadata,
                    }
                )

        # Upsert to dense index (within namespace)
        logger.info(
            f"Upserting {len(dense_vectors)} vectors to dense index (namespace: {namespace})"
        )
        dense_index.upsert(vectors=dense_vectors, namespace=namespace)

        # Note: Sparse index implementation would go here for true hybrid search
        # For now, we're using dense vectors only which still provides excellent results

        return len(dense_vectors)

    except Exception as e:
        logger.error(f"Error indexing chunks: {e}", exc_info=True)
        raise


@router.get("/stats")
async def get_document_stats(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """
    Get statistics about indexed documents for the current session.

    Args:
        x_session_id: Session ID for namespace filtering

    Returns:
        dict: Document statistics matching frontend DocumentStats type
    """
    namespace = x_session_id or DEFAULT_NAMESPACE

    try:
        pinecone_client = get_pinecone_client()
        stats = pinecone_client.index_stats(namespace=namespace)

        # Extract vector count from Pinecone stats
        total_chunks = stats.get("dense", {}).get("total_vector_count", 0)
        dimension = stats.get("dense", {}).get("dimension", 1536)

        # Count unique documents by querying for unique sources
        total_documents = 0
        if total_chunks > 0:
            try:
                index = pinecone_client.get_index()
                # Use a dummy vector to query
                dummy_vector = [0.0] * dimension

                # Query to get metadata
                results = index.query(
                    vector=dummy_vector,
                    top_k=min(10000, total_chunks),  # Get as many as possible
                    include_metadata=True,
                    namespace=namespace,
                )

                # Extract unique sources
                sources = set()
                for match in results.get("matches", []):
                    source = match.get("metadata", {}).get("source")
                    if source:
                        sources.add(source)
                total_documents = len(sources)
            except Exception as e:
                logger.warning(f"Could not count documents: {e}")
                total_documents = 0

        # Calculate approximate index size
        # 4 bytes per float * dimension * number of vectors / 1024^2 for MB
        size_mb = (total_chunks * dimension * 4) / (1024 * 1024)
        index_size = f"{size_mb:.2f} MB" if size_mb > 0 else "0 MB"

        # Return structure matching frontend DocumentStats type
        from datetime import datetime

        return {
            "total_documents": total_documents,
            "total_chunks": total_chunks,
            "total_embeddings": total_chunks,  # Each chunk has one embedding
            "index_size": index_size,
            "last_updated": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        # Return JSONResponse with explicit CORS headers on error
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "detail": f"Failed to fetch document statistics: {str(e)}",
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )


@router.delete("/all")
async def delete_all_documents(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """
    Delete all documents from the session's namespace.

    Args:
        x_session_id: Session ID for namespace isolation

    Returns:
        dict: Deletion status
    """
    namespace = x_session_id or DEFAULT_NAMESPACE

    try:
        pinecone_client = get_pinecone_client()
        success = pinecone_client.delete_all_vectors(namespace=namespace)

        if success:
            return {
                "success": True,
                "message": f"All documents deleted from namespace: {namespace}",
                "namespace": namespace,
            }
        else:
            raise HTTPException(status_code=500, detail="Deletion failed")

    except Exception as e:
        logger.error(f"Error deleting documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/cleanup")
async def cleanup_session(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """
    Clean up (delete all vectors in) the session's namespace.
    Called at session start to ensure fresh state.

    Args:
        x_session_id: Session ID for namespace isolation

    Returns:
        dict: Cleanup status
    """
    namespace = x_session_id or DEFAULT_NAMESPACE

    try:
        pinecone_client = get_pinecone_client()

        # Check if namespace has any vectors first
        stats = pinecone_client.index_stats(namespace=namespace)
        vector_count = stats.get("dense", {}).get("total_vector_count", 0)

        if vector_count > 0:
            success = pinecone_client.delete_namespace(namespace)
            if success:
                logger.info(
                    f"Cleaned up namespace: {namespace} ({vector_count} vectors deleted)"
                )
                return {
                    "success": True,
                    "message": f"Namespace cleaned up: {vector_count} vectors deleted",
                    "namespace": namespace,
                    "vectors_deleted": vector_count,
                }
            else:
                raise HTTPException(status_code=500, detail="Cleanup failed")
        else:
            return {
                "success": True,
                "message": "Namespace already empty",
                "namespace": namespace,
                "vectors_deleted": 0,
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up namespace: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/list")
async def list_documents(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """
    List all documents in the session's namespace.
    Returns unique source names from indexed vectors.

    Args:
        x_session_id: Session ID for namespace filtering

    Returns:
        dict: List of document sources
    """
    namespace = x_session_id or DEFAULT_NAMESPACE

    try:
        pinecone_client = get_pinecone_client()
        index = pinecone_client.get_index()

        # Query with a dummy vector to get all metadata
        # Using a zero vector with top_k to fetch samples
        stats = pinecone_client.index_stats(namespace=namespace)
        vector_count = stats.get("dense", {}).get("total_vector_count", 0)

        if vector_count == 0:
            return {
                "success": True,
                "documents": [],
                "namespace": namespace,
            }

        # Use list operation if available, otherwise query with metadata
        # Pinecone doesn't have a direct list-unique-sources, so we query
        # and extract unique sources from metadata
        try:
            # Try to fetch vectors with metadata to extract sources
            # Using a large top_k to get representative sample
            dimension = stats.get("dense", {}).get("dimension", 1536)
            dummy_vector = [0.0] * dimension

            results = index.query(
                vector=dummy_vector,
                top_k=min(100, vector_count),  # Get up to 100 vectors
                include_metadata=True,
                namespace=namespace,
            )

            # Extract unique sources
            sources = set()
            for match in results.get("matches", []):
                source = match.get("metadata", {}).get("source")
                if source:
                    sources.add(source)

            return {
                "success": True,
                "documents": list(sources),
                "count": len(sources),
                "namespace": namespace,
                "total_chunks": vector_count,
            }
        except Exception as e:
            logger.warning(f"Could not list documents: {e}")
            return {
                "success": True,
                "documents": [],
                "namespace": namespace,
                "total_chunks": vector_count,
                "note": "Document listing not available, but chunks exist",
            }

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
