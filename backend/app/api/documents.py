"""
Document upload and processing API endpoints.
Handles file uploads, processing, chunking, embedding, and indexing.
"""

import logging
import tempfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
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


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document.

    Workflow:
    1. Validate file type and size
    2. Extract text from document
    3. Chunk text into smaller pieces
    4. Generate embeddings (dense + sparse)
    5. Index in Pinecone

    Args:
        file: Uploaded file

    Returns:
        dict: Processing results with document ID and stats
    """
    logger.info(f"Received file upload: {file.filename}")

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

        # Generate embeddings and index
        indexed_count = await index_chunks(chunks)

        # Clean up temp file
        Path(temp_file_path).unlink()

        return {
            "success": True,
            "document_id": file.filename,
            "file_type": file_extension,
            "chunks_created": len(chunks),
            "vectors_indexed": indexed_count,
            "metadata": processed["metadata"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


async def index_chunks(chunks: List[dict]) -> int:
    """
    Generate embeddings and index chunks in Pinecone.

    Args:
        chunks: List of chunk dictionaries

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
                indices = sparse_vec["indices"].tolist() if hasattr(sparse_vec["indices"], "tolist") else sparse_vec["indices"]
                values = sparse_vec["values"].tolist() if hasattr(sparse_vec["values"], "tolist") else sparse_vec["values"]

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

        # Upsert to dense index
        logger.info(f"Upserting {len(dense_vectors)} vectors to dense index")
        dense_index.upsert(vectors=dense_vectors)

        # Note: Sparse index implementation would go here for true hybrid search
        # For now, we're using dense vectors only which still provides excellent results

        return len(dense_vectors)

    except Exception as e:
        logger.error(f"Error indexing chunks: {e}", exc_info=True)
        raise


@router.get("/stats")
async def get_document_stats():
    """
    Get statistics about indexed documents.

    Returns:
        dict: Index statistics
    """
    try:
        pinecone_client = get_pinecone_client()
        stats = pinecone_client.index_stats(include_sparse=True)

        return {
            "success": True,
            "stats": stats,
        }

    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/all")
async def delete_all_documents():
    """
    Delete all documents from indexes.

    USE WITH CAUTION - This is irreversible!

    Returns:
        dict: Deletion status
    """
    try:
        pinecone_client = get_pinecone_client()
        success = pinecone_client.delete_all_vectors(include_sparse=True)

        if success:
            return {
                "success": True,
                "message": "All documents deleted from indexes",
            }
        else:
            raise HTTPException(status_code=500, detail="Deletion failed")

    except Exception as e:
        logger.error(f"Error deleting documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
