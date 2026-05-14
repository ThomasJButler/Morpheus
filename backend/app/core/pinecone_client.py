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
                    logger.info(f"Using existing index: {settings.pinecone_index_name}")

                self._index = self._pc.Index(settings.pinecone_index_name)

            except Exception as e:
                logger.error(f"Failed to get/create Pinecone index: {e}")
                raise RuntimeError(f"Pinecone index error: {e}")

        return self._index

    def get_sparse_index(self):
        """
        Get sparse index (not used in simplified version).

        Returns:
            None: Sparse index not available in simplified semantic search mode
        """
        logger.warning("Sparse index not available - using dense semantic search only")
        return None

    def get_both_indexes(self) -> tuple:
        """
        Get dense index (simplified version - no sparse index).

        Returns:
            tuple: (dense_index, None)
        """
        dense = self.get_index()
        sparse = None  # Sparse index not used in simplified version
        return dense, sparse

    def index_stats(self, namespace: str = None) -> dict:
        """
        Get current index statistics.

        Args:
            namespace: Optional namespace to filter stats for

        Returns:
            dict: Index statistics including vector count, dimension, etc.
        """
        try:
            # Dense index stats
            dense_index = self.get_index()
            dense_stats = dense_index.describe_index_stats()

            # Manually serialize namespaces to avoid RLock serialization issues
            namespaces_dict = {}
            if dense_stats.namespaces:
                for namespace_name, namespace_obj in dense_stats.namespaces.items():
                    # Extract only primitive values from namespace objects
                    namespaces_dict[namespace_name] = {
                        "vector_count": getattr(namespace_obj, "vector_count", 0)
                    }

            # If namespace specified, return stats for that namespace only
            if namespace:
                namespace_stats = namespaces_dict.get(namespace, {"vector_count": 0})
                stats = {
                    "dense": {
                        "total_vector_count": namespace_stats.get("vector_count", 0),
                        "dimension": dense_stats.dimension,
                        "namespace": namespace,
                        "namespaces": {namespace: namespace_stats},
                    }
                }
            else:
                stats = {
                    "dense": {
                        "total_vector_count": dense_stats.total_vector_count,
                        "dimension": dense_stats.dimension,
                        "namespaces": namespaces_dict,
                    }
                }

            return stats
        except Exception as e:
            logger.error(f"Failed to get index stats: {e}", exc_info=True)
            return {}

    def delete_all_vectors(self, namespace: str = None) -> bool:
        """
        Delete all vectors from the dense index.
        USE WITH CAUTION - This is irreversible!

        Args:
            namespace: Optional namespace to delete from (if None, deletes ALL vectors)

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Delete from dense index
            dense_index = self.get_index()
            if namespace:
                dense_index.delete(delete_all=True, namespace=namespace)
                logger.warning(f"All vectors deleted from namespace: {namespace}")
            else:
                dense_index.delete(delete_all=True)
                logger.warning("All vectors deleted from dense index (all namespaces)")

            return True
        except Exception as e:
            logger.error(f"Failed to delete vectors: {e}")
            return False

    def delete_namespace(self, namespace: str) -> bool:
        """
        Delete all vectors in a specific namespace.

        Args:
            namespace: Namespace to clear

        Returns:
            bool: True if successful, False otherwise
        """
        if not namespace:
            logger.error("Namespace is required for delete_namespace")
            return False
        return self.delete_all_vectors(namespace=namespace)


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
