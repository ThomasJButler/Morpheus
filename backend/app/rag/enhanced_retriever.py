"""
Enhanced Retriever with advanced RAG techniques.

Integrates:
- Multi-query expansion for improved recall
- Query rewriting for better matching
- Cross-encoder reranking for precision
- Contextual compression for relevant excerpts
- Reciprocal Rank Fusion for combining results

2025 Best Practices Implementation.
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Tuple

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.pinecone_client import get_pinecone_client
from app.models.chat import Citation, RetrievalMetrics
from app.rag.reranker import Reranker
from app.rag.query_rewriter import QueryRewriter

logger = logging.getLogger(__name__)


class EnhancedRetriever:
    """
    Advanced retrieval with 2025 best practices.

    Features:
    - Multi-query expansion: Generate multiple query variations
    - Query rewriting: Optimize queries for search
    - Hybrid search: Dense + BM25 scoring
    - Cross-encoder reranking: Improve result quality
    - Contextual compression: Extract most relevant parts
    - Reciprocal Rank Fusion: Combine results from multiple queries
    """

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.pinecone_client = get_pinecone_client()
        self.index = self.pinecone_client.get_index()

        # Initialize sub-components
        self.reranker = Reranker()
        self.query_rewriter = QueryRewriter()

        logger.info("EnhancedRetriever initialized with all components")

    async def embed_query(self, query: str) -> List[float]:
        """Generate dense embedding for query."""
        try:
            dimensions = 512 if "small" in settings.embedding_model else None
            embedding_params = {
                "model": settings.embedding_model,
                "input": query
            }
            if dimensions:
                embedding_params["dimensions"] = dimensions

            response = await self.openai_client.embeddings.create(**embedding_params)
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise

    async def embed_queries_batch(self, queries: List[str]) -> List[List[float]]:
        """Batch embed multiple queries for efficiency."""
        try:
            dimensions = 512 if "small" in settings.embedding_model else None
            embedding_params = {
                "model": settings.embedding_model,
                "input": queries
            }
            if dimensions:
                embedding_params["dimensions"] = dimensions

            response = await self.openai_client.embeddings.create(**embedding_params)
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            raise

    async def generate_query_variations(
        self, query: str, num_variations: int = 3
    ) -> List[str]:
        """
        Generate multiple query variations for better recall.

        Uses LLM to create semantically similar but differently phrased queries.
        """
        if not settings.enable_multi_query:
            return [query]

        try:
            # Use the query rewriter's expand function
            variations = await self.query_rewriter.expand_query(
                query, num_expansions=num_variations
            )
            logger.info(f"Generated {len(variations)} query variations")
            return variations
        except Exception as e:
            logger.error(f"Query variation generation failed: {e}")
            return [query]

    async def search_single_query(
        self,
        query: str,
        query_embedding: List[float],
        top_k: int,
        namespace: str,
    ) -> List[dict]:
        """Execute a single query search."""
        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                namespace=namespace,
            )

            contexts = []
            for match in results.get("matches", []):
                contexts.append({
                    "id": match.id,
                    "text": match.metadata.get("text", ""),
                    "source": match.metadata.get("source", "Unknown"),
                    "page": match.metadata.get("page"),
                    "chunk_id": match.id,
                    "score": match.score,
                    "metadata": match.metadata,
                })

            return contexts
        except Exception as e:
            logger.error(f"Single query search failed: {e}")
            return []

    def reciprocal_rank_fusion(
        self,
        result_lists: List[List[dict]],
        k: int = 60,
    ) -> List[dict]:
        """
        Combine results from multiple queries using Reciprocal Rank Fusion.

        RRF formula: score = sum(1 / (k + rank)) for each list where doc appears

        Args:
            result_lists: List of result lists from different queries
            k: Constant to prevent high ranks dominating (default: 60)

        Returns:
            Combined and sorted results
        """
        fused_scores = {}
        doc_data = {}

        for result_list in result_lists:
            for rank, doc in enumerate(result_list):
                doc_id = doc.get("id") or doc.get("chunk_id")
                if not doc_id:
                    continue

                # Calculate RRF contribution
                rrf_score = 1.0 / (k + rank + 1)

                if doc_id in fused_scores:
                    fused_scores[doc_id] += rrf_score
                else:
                    fused_scores[doc_id] = rrf_score
                    doc_data[doc_id] = doc

        # Sort by fused score
        sorted_results = []
        for doc_id, rrf_score in sorted(
            fused_scores.items(), key=lambda x: x[1], reverse=True
        ):
            doc = doc_data[doc_id].copy()
            doc["rrf_score"] = rrf_score
            doc["original_score"] = doc.get("score", 0)
            doc["score"] = rrf_score  # Use RRF as primary score
            sorted_results.append(doc)

        logger.info(
            f"RRF combined {sum(len(r) for r in result_lists)} results into {len(sorted_results)} unique"
        )
        return sorted_results

    async def retrieve_with_multi_query(
        self,
        query: str,
        top_k: Optional[int] = None,
        namespace: str = None,
    ) -> Tuple[List[dict], RetrievalMetrics]:
        """
        Enhanced retrieval using multi-query expansion and RRF.

        Steps:
        1. Generate query variations
        2. Embed all queries in batch
        3. Search with each query in parallel
        4. Combine results with RRF
        5. Apply reranking (if enabled)
        """
        start_time = time.time()
        top_k = top_k or settings.top_k_results
        namespace = namespace or "default"

        try:
            # 1. Generate query variations
            queries = await self.generate_query_variations(
                query, num_variations=settings.multi_query_count
            )

            # 2. Batch embed all queries
            embeddings = await self.embed_queries_batch(queries)

            # 3. Search with each query in parallel
            search_tasks = [
                self.search_single_query(q, emb, top_k, namespace)
                for q, emb in zip(queries, embeddings)
            ]
            result_lists = await asyncio.gather(*search_tasks)

            # 4. Combine results with RRF
            combined_results = self.reciprocal_rank_fusion(result_lists)

            # 5. Take top results
            top_results = combined_results[:top_k * 2]  # Extra for reranking

            # 6. Apply reranking if enabled
            if settings.use_reranker and top_results:
                top_results = await self.reranker.rerank(
                    query, top_results, top_k=settings.rerank_top_k
                )

            # 7. Filter by minimum score and limit
            final_results = [
                r for r in top_results
                if r.get("score", 0) >= settings.min_relevance_score
            ][:top_k]

            # Calculate metrics
            query_time = (time.time() - start_time) * 1000
            metrics = RetrievalMetrics(
                query_time_ms=query_time,
                num_results=len(final_results),
                reranked=settings.use_reranker,
                top_score=final_results[0]["score"] if final_results else None,
                average_score=(
                    sum(r["score"] for r in final_results) / len(final_results)
                    if final_results
                    else None
                ),
            )

            logger.info(
                f"Multi-query retrieval: {len(queries)} queries, "
                f"{len(final_results)} results in {query_time:.2f}ms"
            )

            return final_results, metrics

        except Exception as e:
            logger.error(f"Multi-query retrieval failed: {e}", exc_info=True)
            raise

    async def compress_context(
        self,
        query: str,
        contexts: List[dict],
        max_contexts: int = 5,
    ) -> List[dict]:
        """
        Contextual compression: Extract most relevant parts of contexts.

        Uses LLM to identify and extract the portions of each context
        that are most relevant to answering the query.
        """
        if not contexts:
            return []

        # Limit contexts to process
        contexts_to_compress = contexts[:max_contexts]

        try:
            compression_prompt = f"""Given the question and document excerpts below, extract ONLY the sentences or phrases that are directly relevant to answering the question. Remove any irrelevant information.

Question: {query}

For each excerpt, output the relevant portion. If an excerpt is completely irrelevant, output "NOT_RELEVANT".

Format your response as a JSON array where each element corresponds to an excerpt:
["relevant part 1", "relevant part 2", ...]
"""

            context_text = "\n\n".join([
                f"Excerpt {i+1}: {ctx.get('text', '')[:500]}"
                for i, ctx in enumerate(contexts_to_compress)
            ])

            response = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=1000,
                messages=[{
                    "role": "user",
                    "content": f"{compression_prompt}\n\n{context_text}"
                }],
            )

            # Parse response
            import json
            response_text = response.content[0].text.strip()

            # Try to extract JSON array
            try:
                # Handle potential markdown code blocks
                if response_text.startswith("```"):
                    lines = response_text.split("\n")
                    response_text = "\n".join(lines[1:-1])

                compressed_parts = json.loads(response_text)

                # Update contexts with compressed text
                compressed_contexts = []
                for i, ctx in enumerate(contexts_to_compress):
                    if i < len(compressed_parts):
                        compressed_text = compressed_parts[i]
                        if compressed_text and compressed_text != "NOT_RELEVANT":
                            ctx_copy = ctx.copy()
                            ctx_copy["original_text"] = ctx.get("text", "")
                            ctx_copy["text"] = compressed_text
                            ctx_copy["compressed"] = True
                            compressed_contexts.append(ctx_copy)
                    else:
                        compressed_contexts.append(ctx)

                # Add remaining contexts that weren't compressed
                compressed_contexts.extend(contexts[max_contexts:])

                logger.info(
                    f"Compressed {len(contexts_to_compress)} contexts, "
                    f"kept {len(compressed_contexts)}"
                )
                return compressed_contexts

            except json.JSONDecodeError:
                logger.warning("Failed to parse compression response, using originals")
                return contexts

        except Exception as e:
            logger.error(f"Context compression failed: {e}")
            return contexts

    async def retrieve_enhanced(
        self,
        query: str,
        top_k: Optional[int] = None,
        namespace: str = None,
        use_compression: bool = False,
        rewrite_query: bool = True,
    ) -> Tuple[List[dict], RetrievalMetrics]:
        """
        Full enhanced retrieval pipeline.

        Combines:
        1. Query rewriting (optional)
        2. Multi-query expansion
        3. Hybrid search with RRF
        4. Cross-encoder reranking
        5. Contextual compression (optional)

        Args:
            query: User query
            top_k: Number of results to return
            namespace: Pinecone namespace
            use_compression: Apply contextual compression
            rewrite_query: Rewrite query for better matching

        Returns:
            Tuple of (contexts, metrics)
        """
        start_time = time.time()
        original_query = query

        # 1. Optionally rewrite query
        if rewrite_query and settings.enable_query_rewriting:
            query = await self.query_rewriter.rewrite_for_retrieval(query)
            logger.info(f"Query rewritten: '{original_query[:30]}...' -> '{query[:30]}...'")

        # 2. Multi-query retrieval with RRF
        contexts, metrics = await self.retrieve_with_multi_query(
            query, top_k, namespace
        )

        # 3. Optionally apply compression
        if use_compression and contexts:
            contexts = await self.compress_context(original_query, contexts)

        # Update metrics with total time
        total_time = (time.time() - start_time) * 1000
        metrics = RetrievalMetrics(
            query_time_ms=total_time,
            num_results=len(contexts),
            reranked=metrics.reranked,
            top_score=contexts[0]["score"] if contexts else None,
            average_score=(
                sum(c["score"] for c in contexts) / len(contexts)
                if contexts
                else None
            ),
        )

        return contexts, metrics

    def create_citations(self, contexts: List[dict]) -> List[Citation]:
        """Create citation objects from contexts."""
        citations = []
        seen = set()

        for ctx in contexts:
            chunk_id = ctx.get("chunk_id") or ctx.get("id")
            if chunk_id in seen:
                continue
            seen.add(chunk_id)

            citation = Citation(
                source=ctx.get("source", "Unknown"),
                page=ctx.get("page"),
                chunk_id=chunk_id,
                relevance_score=ctx.get("score", 0),
                text_preview=ctx.get("text", "")[:200],
            )
            citations.append(citation)

        return citations


# Convenience functions

async def retrieve_enhanced(
    query: str,
    top_k: Optional[int] = None,
    namespace: str = None,
    use_compression: bool = False,
) -> Tuple[List[dict], RetrievalMetrics]:
    """
    Quick enhanced retrieval function.

    Args:
        query: User query
        top_k: Number of results
        namespace: Pinecone namespace
        use_compression: Apply contextual compression

    Returns:
        Tuple of (contexts, metrics)
    """
    retriever = EnhancedRetriever()
    return await retriever.retrieve_enhanced(
        query, top_k, namespace, use_compression
    )


async def retrieve_with_multi_query(
    query: str,
    top_k: Optional[int] = None,
    namespace: str = None,
) -> Tuple[List[dict], RetrievalMetrics]:
    """
    Multi-query retrieval with RRF.

    Args:
        query: User query
        top_k: Number of results
        namespace: Pinecone namespace

    Returns:
        Tuple of (contexts, metrics)
    """
    retriever = EnhancedRetriever()
    return await retriever.retrieve_with_multi_query(query, top_k, namespace)
