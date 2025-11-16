"""
Pinecone client initialization and management.
Handles connection to Pinecone vector database with proper error handling.
"""

import logging
from typing import Optional

from pinecone import Pinecone, ServerlessSpec

from app.core.config import settings

logger = logging.getLogger(__name__)


class PineconeClient:
    """
    Manages Pinecone client connection and index access.
    Supports both dense and sparse indexes for hybrid search.
    Implements singleton pattern for connection pooling.
    """

    _instance: Optional["PineconeClient"] = None
    _pc: Optional[Pinecone] = None
    _index = None  # Dense index
    _sparse_index = None  # Sparse index for hybrid search

    def __new__(cls):
        """Ensure only one instance exists (singleton)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Pinecone client if not already initialized."""
        if self._pc is None:
            self._initialize_client()

    def _initialize_client(self) -> None:
        """Initialize Pinecone client with API key."""
        try:
            self._pc = Pinecone(api_key=settings.pinecone_api_key)
            logger.info("Pinecone client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone client: {e}")
            raise

    def get_index(self):
        """
        Get or create Pinecone index.

        Returns:
            Index: Pinecone index instance

        Raises:
            RuntimeError: If index cannot be accessed or created
        """
        if self._index is None:
            try:
                # Check if index exists
                existing_indexes = self._pc.list_indexes()
                index_names = [idx.name for idx in existing_indexes]

                if settings.pinecone_index_name not in index_names:
                    logger.info(
                        f"Creating Pinecone index: {settings.pinecone_index_name}"
                    )
                    self._pc.create_index(
                        name=settings.pinecone_index_name,
                        dimension=settings.pinecone_dimension,
                        metric="cosine",
                        spec=ServerlessSpec(
                            cloud="aws", region=settings.pinecone_environment
                        ),
                    )
                    logger.info("Index created successfully")
                else:
                    logger.info(
                        f"Using existing index: {settings.pinecone_index_name}"
                    )

                self._index = self._pc.Index(settings.pinecone_index_name)

            except Exception as e:
                logger.error(f"Failed to get/create Pinecone index: {e}")
                raise RuntimeError(f"Pinecone index error: {e}")

        return self._index

    def get_sparse_index(self):
        """
        Get or create Pinecone sparse index for hybrid search.

        Returns:
            Index: Pinecone sparse index instance

        Raises:
            RuntimeError: If index cannot be accessed or created
        """
        if not settings.use_hybrid_search:
            logger.warning("Hybrid search is disabled in settings")
            return None

        if self._sparse_index is None:
            try:
                # Check if sparse index exists
                existing_indexes = self._pc.list_indexes()
                index_names = [idx.name for idx in existing_indexes]

                sparse_index_name = settings.pinecone_sparse_index_name

                if sparse_index_name not in index_names:
                    logger.info(f"Creating Pinecone sparse index: {sparse_index_name}")
                    # Sparse indexes typically use lower dimensions
                    self._pc.create_index(
                        name=sparse_index_name,
                        dimension=settings.pinecone_dimension,
                        metric="dotproduct",  # Better for sparse vectors
                        spec=ServerlessSpec(
                            cloud="aws", region=settings.pinecone_environment
                        ),
                    )
                    logger.info("Sparse index created successfully")
                else:
                    logger.info(f"Using existing sparse index: {sparse_index_name}")

                self._sparse_index = self._pc.Index(sparse_index_name)

            except Exception as e:
                logger.error(f"Failed to get/create sparse index: {e}")
                raise RuntimeError(f"Pinecone sparse index error: {e}")

        return self._sparse_index

    def get_both_indexes(self) -> tuple:
        """
        Get both dense and sparse indexes for hybrid search.

        Returns:
            tuple: (dense_index, sparse_index)
        """
        dense = self.get_index()
        sparse = self.get_sparse_index() if settings.use_hybrid_search else None
        return dense, sparse

    def index_stats(self, include_sparse: bool = False) -> dict:
        """
        Get current index statistics.

        Args:
            include_sparse: Include sparse index stats if available

        Returns:
            dict: Index statistics including vector count, dimension, etc.
        """
        try:
            stats = {}

            # Dense index stats
            dense_index = self.get_index()
            stats["dense"] = dense_index.describe_index_stats()

            # Sparse index stats if requested and available
            if include_sparse and settings.use_hybrid_search:
                try:
                    sparse_index = self.get_sparse_index()
                    if sparse_index:
                        stats["sparse"] = sparse_index.describe_index_stats()
                except Exception as e:
                    logger.warning(f"Could not get sparse index stats: {e}")

            return stats
        except Exception as e:
            logger.error(f"Failed to get index stats: {e}")
            return {}

    def delete_all_vectors(self, include_sparse: bool = True) -> bool:
        """
        Delete all vectors from the index.
        USE WITH CAUTION - This is irreversible.

        Args:
            include_sparse: Also delete from sparse index if available

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Delete from dense index
            dense_index = self.get_index()
            dense_index.delete(delete_all=True)
            logger.warning("All vectors deleted from dense index")

            # Delete from sparse index if requested
            if include_sparse and settings.use_hybrid_search:
                try:
                    sparse_index = self.get_sparse_index()
                    if sparse_index:
                        sparse_index.delete(delete_all=True)
                        logger.warning("All vectors deleted from sparse index")
                except Exception as e:
                    logger.error(f"Failed to delete from sparse index: {e}")
                    return False

            return True
        except Exception as e:
            logger.error(f"Failed to delete vectors: {e}")
            return False


# Singleton instance
_pinecone_client: Optional[PineconeClient] = None


def get_pinecone_client() -> PineconeClient:
    """
    Get singleton Pinecone client instance.

    Returns:
        PineconeClient: Initialized Pinecone client
    """
    global _pinecone_client
    if _pinecone_client is None:
        _pinecone_client = PineconeClient()
    return _pinecone_client


def get_pinecone_index():
    """
    FastAPI dependency to get Pinecone index.

    Returns:
        Index: Pinecone index instance
    """
    client = get_pinecone_client()
    return client.get_index()
