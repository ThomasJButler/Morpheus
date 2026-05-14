"""
Reranking logic for improving retrieval relevance.
Uses cross-encoder models to reorder results based on query-document relevance.
"""

import logging
from typing import Any, List, Optional

from pinecone import Pinecone

from app.core.config import settings

logger = logging.getLogger(__name__)


class Reranker:
    """
    Handles reranking of retrieved results using cross-encoder models.

    Reranking significantly improves the relevance of top results by using
    a more expensive but accurate cross-encoder model to score query-document pairs.
    """

    def __init__(self, model: Optional[str] = None):
        """
        Initialise reranker with Pinecone client.

        Args:
            model: Reranker model name (defaults to config)
        """
        self.model = model or settings.reranker_model
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        logger.info(f"Reranker initialised with model: {self.model}")

    async def rerank(
        self,
        query: str,
        contexts: List[dict],
        top_k: Optional[int] = None,
    ) -> List[dict]:
        """
        Rerank contexts based on relevance to query using Pinecone Reranker API.

        Args:
            query: User query
            contexts: List of context dictionaries with 'text' field
            top_k: Number of results to return after reranking

        Returns:
            Reranked list of contexts with updated scores
        """
        if not settings.use_reranker:
            logger.info("Reranking disabled in settings")
            return contexts

        if not contexts:
            logger.warning("No contexts to rerank")
            return contexts

        top_k = top_k or settings.rerank_top_k

        try:
            # Extract document texts for reranking
            documents = [ctx.get("text", "") for ctx in contexts]

            logger.info(
                f"Reranking {len(contexts)} contexts using Pinecone Reranker ({self.model})"
            )

            # Call Pinecone Reranker API
            rerank_results = self._call_pinecone_reranker(query, documents, top_k)

            # Map reranked results back to original contexts
            reranked_contexts = []
            for result in rerank_results:
                # Get original context by index
                original_ctx = contexts[result.index].copy()

                # Update with rerank score
                original_ctx["rerank_score"] = result.score
                original_ctx["reranked"] = True
                original_ctx["reranker_model"] = self.model

                # Preserve original retrieval score
                if "score" in original_ctx:
                    original_ctx["original_score"] = original_ctx["score"]

                # Use rerank score as primary score
                original_ctx["score"] = result.score

                reranked_contexts.append(original_ctx)

            logger.info(
                f"Reranking complete: {len(reranked_contexts)} contexts returned"
            )
            return reranked_contexts

        except Exception as e:
            logger.error(f"Reranking failed: {e}", exc_info=True)
            # Fall back to original results
            return contexts[:top_k]

    def _call_pinecone_reranker(
        self,
        query: str,
        documents: List[str],
        top_n: Optional[int] = None,
    ) -> List[Any]:
        """
        Call Pinecone's reranker API.

        Uses Pinecone Inference API to rerank documents based on query relevance.
        The cross-encoder model provides significantly better relevance scoring
        than initial retrieval alone.

        Args:
            query: Search query
            documents: List of document texts
            top_n: Number of top results to return

        Returns:
            List of rerank results with scores and indices
        """
        top_n = top_n or settings.rerank_top_k

        try:
            # Call Pinecone Inference Reranker API
            rerank_response = self.pc.inference.rerank(
                model=self.model,
                query=query,
                documents=documents,
                top_n=top_n,
                return_documents=False,  # We already have the documents
            )

            # Return the reranked results
            return rerank_response.data

        except Exception as e:
            logger.error(f"Pinecone reranker API call failed: {e}")
            raise

    async def rerank_with_scores(
        self,
        query: str,
        contexts: List[dict],
        top_k: Optional[int] = None,
    ) -> tuple[List[dict], dict]:
        """
        Rerank contexts and return metrics about the reranking process.

        Args:
            query: User query
            contexts: List of contexts
            top_k: Number of results to return

        Returns:
            Tuple of (reranked contexts, reranking metrics)
        """
        original_order = [ctx.get("chunk_id") for ctx in contexts]

        reranked_contexts = await self.rerank(query, contexts, top_k)

        reranked_order = [ctx.get("chunk_id") for ctx in reranked_contexts]

        # Calculate how much the order changed
        changes = sum(
            1 for i, (orig, new) in enumerate(zip(original_order, reranked_order))
            if orig != new
        )

        metrics = {
            "original_count": len(contexts),
            "reranked_count": len(reranked_contexts),
            "order_changes": changes,
            "model": self.model,
        }

        logger.info(f"Reranking metrics: {changes} position changes out of {len(reranked_contexts)}")

        return reranked_contexts, metrics


# Convenience function
async def rerank_contexts(
    query: str,
    contexts: List[dict],
    top_k: Optional[int] = None,
) -> List[dict]:
    """
    Quick reranking function.

    Args:
        query: User query
        contexts: List of contexts
        top_k: Number of results to return

    Returns:
        Reranked contexts
    """
    reranker = Reranker()
    return await reranker.rerank(query, contexts, top_k)
