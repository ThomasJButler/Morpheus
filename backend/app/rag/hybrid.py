"""
Hybrid/Cascading RAG pipeline.
Combines dense (semantic) and sparse (lexical/BM25) retrieval for optimal performance.
Achieves up to 48% improvement over single-method retrieval.

Based on preserved code from MorpheusRAGLearningDocuments/original-code/hybrid.py
Modified to use in-memory BM25 (works with serverless Pinecone).
"""

import asyncio
import logging
import time
from typing import AsyncGenerator, Dict, List, Optional, Tuple

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.morpheus_prompts import get_system_prompt, get_user_prompt_template
from app.core.pinecone_client import get_pinecone_client
from app.models.chat import Citation, RAGMode, RetrievalMetrics, StreamChunk

logger = logging.getLogger(__name__)


class InMemoryBM25:
    """
    In-memory BM25 implementation for sparse retrieval.

    This allows hybrid search without requiring a separate sparse Pinecone index,
    making it compatible with serverless Pinecone (zero additional cost).

    The corpus is built from retrieved dense results, then BM25 re-scores them.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        """
        Initialize BM25 with tuning parameters.

        Args:
            k1: Term frequency saturation parameter (default: 1.5)
            b: Document length normalization (default: 0.75)
        """
        self.k1 = k1
        self.b = b
        self.corpus = []
        self.doc_lengths = []
        self.avg_doc_length = 0
        self.doc_term_freqs = []
        self.idf = {}

    def _tokenize(self, text: str) -> List[str]:
        """Simple whitespace tokenization with lowercasing."""
        import re
        # Remove punctuation and split on whitespace
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        return text.split()

    def fit(self, documents: List[str]) -> None:
        """
        Fit BM25 on a corpus of documents.

        Args:
            documents: List of document texts
        """
        self.corpus = documents
        self.doc_lengths = []
        self.doc_term_freqs = []

        # Calculate document frequencies for IDF
        doc_freq = {}

        for doc in documents:
            tokens = self._tokenize(doc)
            self.doc_lengths.append(len(tokens))

            # Term frequency for this document
            term_freq = {}
            seen_terms = set()
            for token in tokens:
                term_freq[token] = term_freq.get(token, 0) + 1
                if token not in seen_terms:
                    doc_freq[token] = doc_freq.get(token, 0) + 1
                    seen_terms.add(token)

            self.doc_term_freqs.append(term_freq)

        # Calculate average document length
        self.avg_doc_length = sum(self.doc_lengths) / len(self.doc_lengths) if self.doc_lengths else 0

        # Calculate IDF for each term
        n_docs = len(documents)
        import math
        for term, df in doc_freq.items():
            # BM25 IDF formula
            self.idf[term] = math.log((n_docs - df + 0.5) / (df + 0.5) + 1)

    def score(self, query: str) -> List[float]:
        """
        Score all documents against a query.

        Args:
            query: Search query text

        Returns:
            List of BM25 scores for each document
        """
        query_tokens = self._tokenize(query)
        scores = []

        for i, doc_tf in enumerate(self.doc_term_freqs):
            score = 0.0
            doc_len = self.doc_lengths[i]

            for term in query_tokens:
                if term in doc_tf:
                    tf = doc_tf[term]
                    idf = self.idf.get(term, 0)

                    # BM25 scoring formula
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avg_doc_length)
                    score += idf * (numerator / denominator)

            scores.append(score)

        return scores


class HybridRAG:
    """
    Cascading retrieval RAG implementation combining dense and sparse search.

    Pipeline:
    1. Generate dense embedding (OpenAI)
    2. Query Pinecone dense index
    3. Apply in-memory BM25 scoring to results
    4. Merge results with weighted scoring (RRF-inspired)
    5. Deduplicate and sort by combined score
    6. Generate response with Claude
    """

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.pinecone_client = get_pinecone_client()
        self.index = self.pinecone_client.get_index()

        # BM25 for sparse scoring (initialized per query)
        self.bm25 = InMemoryBM25()

        logger.info("HybridRAG initialized with in-memory BM25")

    async def embed_query(self, query: str) -> List[float]:
        """
        Generate dense embedding for semantic search.

        Args:
            query: User query text

        Returns:
            Dense embedding vector
        """
        try:
            # For text-embedding-3-small, explicitly set dimensions to 512
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
            logger.error(f"Dense embedding generation failed: {e}")
            raise

    async def retrieve_dense(
        self, query_embedding: List[float], top_k: int, namespace: str = None
    ) -> List[dict]:
        """
        Retrieve results from dense (semantic) index.

        Args:
            query_embedding: Dense query vector
            top_k: Number of results to retrieve
            namespace: Pinecone namespace for session isolation

        Returns:
            List of matches from dense index
        """
        namespace = namespace or "default"

        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                namespace=namespace,
            )
            return results.get("matches", [])
        except Exception as e:
            logger.error(f"Dense retrieval failed: {e}")
            return []

    def apply_bm25_scoring(
        self, query: str, dense_matches: List[dict]
    ) -> List[dict]:
        """
        Apply BM25 scoring to dense retrieval results.

        This creates a hybrid score by combining:
        - Dense (semantic) similarity from Pinecone
        - Sparse (lexical) relevance from BM25

        Args:
            query: Original query text
            dense_matches: Matches from dense retrieval

        Returns:
            Matches with added BM25 scores
        """
        if not dense_matches:
            return []

        # Extract texts for BM25
        texts = [match.metadata.get("text", "") for match in dense_matches]

        # Fit BM25 on the retrieved documents
        self.bm25.fit(texts)

        # Score each document
        bm25_scores = self.bm25.score(query)

        # Normalize BM25 scores to 0-1 range
        max_bm25 = max(bm25_scores) if bm25_scores and max(bm25_scores) > 0 else 1
        normalized_bm25 = [s / max_bm25 for s in bm25_scores]

        # Add BM25 scores to matches
        for i, match in enumerate(dense_matches):
            match.metadata["bm25_score"] = normalized_bm25[i]
            match.metadata["raw_bm25_score"] = bm25_scores[i]

        return dense_matches

    def merge_scores(
        self, matches: List[dict]
    ) -> List[dict]:
        """
        Merge dense and sparse scores using weighted combination.

        Uses settings.dense_weight and settings.sparse_weight.

        Args:
            matches: Matches with both dense and BM25 scores

        Returns:
            Sorted list with combined scores
        """
        results = []

        for match in matches:
            dense_score = match.score
            sparse_score = match.metadata.get("bm25_score", 0.0)

            # Weighted combination
            combined_score = (
                dense_score * settings.dense_weight +
                sparse_score * settings.sparse_weight
            )

            results.append({
                "id": match.id,
                "score": combined_score,
                "metadata": match.metadata,
                "dense_score": dense_score,
                "sparse_score": sparse_score,
                "source": "hybrid",
            })

        # Sort by combined score
        results.sort(key=lambda x: x["score"], reverse=True)

        logger.info(
            f"Merged {len(matches)} results with hybrid scoring "
            f"(dense_weight={settings.dense_weight}, sparse_weight={settings.sparse_weight})"
        )

        return results

    async def retrieve_hybrid(
        self, query: str, top_k: Optional[int] = None, namespace: str = None
    ) -> Tuple[List[dict], RetrievalMetrics]:
        """
        Perform hybrid retrieval combining dense and sparse search.

        Args:
            query: User query
            top_k: Number of results
            namespace: Pinecone namespace for session isolation

        Returns:
            Tuple of (merged contexts, retrieval metrics)
        """
        start_time = time.time()
        top_k = top_k or settings.top_k_results
        namespace = namespace or "default"

        try:
            # 1. Generate dense embedding
            dense_embedding = await self.embed_query(query)

            # 2. Retrieve from dense index (get more than top_k for better BM25 re-ranking)
            dense_matches = await self.retrieve_dense(
                dense_embedding,
                top_k=top_k * 2,  # Retrieve more for re-ranking
                namespace=namespace
            )

            # 3. Apply BM25 scoring
            scored_matches = self.apply_bm25_scoring(query, dense_matches)

            # 4. Merge scores
            merged_results = self.merge_scores(scored_matches)

            # 5. Take top-k after merging
            merged_results = merged_results[:top_k]

            # 6. Filter by minimum relevance score
            filtered_results = [
                r for r in merged_results
                if r["score"] >= settings.min_relevance_score
            ]

            # Calculate metrics
            query_time = (time.time() - start_time) * 1000
            metrics = RetrievalMetrics(
                query_time_ms=query_time,
                num_results=len(filtered_results),
                reranked=False,  # Reranking is a separate step
                top_score=filtered_results[0]["score"] if filtered_results else None,
                average_score=(
                    sum(r["score"] for r in filtered_results) / len(filtered_results)
                    if filtered_results
                    else None
                ),
            )

            # Format contexts
            contexts = [
                {
                    "text": r["metadata"].get("text", ""),
                    "source": r["metadata"].get("source", "Unknown"),
                    "page": r["metadata"].get("page"),
                    "chunk_id": r["id"],
                    "score": r["score"],
                    "dense_score": r["dense_score"],
                    "sparse_score": r["sparse_score"],
                    "retrieval_source": r["source"],
                }
                for r in filtered_results
            ]

            logger.info(
                f"Hybrid retrieval completed: {len(contexts)} contexts in {query_time:.2f}ms"
            )

            return contexts, metrics

        except Exception as e:
            logger.error(f"Hybrid retrieval failed: {e}", exc_info=True)
            raise

    def format_context_for_prompt(self, contexts: List[dict]) -> str:
        """
        Format retrieved contexts into a prompt-friendly string.

        Args:
            contexts: List of context dictionaries

        Returns:
            Formatted context string
        """
        if not contexts:
            return "No relevant context found."

        formatted = []
        for i, ctx in enumerate(contexts, 1):
            source = ctx["source"]
            page = f", Page {ctx['page']}" if ctx.get("page") else ""
            text = ctx["text"]
            retrieval_info = ctx.get("retrieval_source", "unknown")
            formatted.append(
                f"[Context {i}] (Source: {source}{page}, Retrieved via: {retrieval_info})\n{text}"
            )

        return "\n\n".join(formatted)

    def create_citations(self, contexts: List[dict]) -> List[Citation]:
        """
        Create citation objects from context chunks.

        Args:
            contexts: List of context dictionaries

        Returns:
            List of Citation objects
        """
        citations = []
        for ctx in contexts:
            citation = Citation(
                source=ctx["source"],
                page=ctx.get("page"),
                chunk_id=ctx.get("chunk_id"),
                relevance_score=ctx["score"],
                text_preview=ctx["text"][:200],
            )
            citations.append(citation)
        return citations

    async def generate_response(
        self, query: str, contexts: List[dict]
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming response using Claude with Morpheus personality.

        Args:
            query: User query
            contexts: Retrieved context chunks

        Yields:
            Response text chunks
        """
        context_str = self.format_context_for_prompt(contexts)

        # Use Morpheus personality system
        system_prompt = get_system_prompt()

        # Get user prompt template
        user_prompt_template = get_user_prompt_template()
        user_prompt = user_prompt_template.format(
            context=context_str,
            query=query
        )

        try:
            async with self.anthropic_client.messages.stream(
                model=settings.anthropic_model,
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text

        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            raise

    async def process_query_streaming(
        self, query: str, top_k: Optional[int] = None, namespace: str = None
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Process query with hybrid retrieval and streaming response.

        Args:
            query: User query
            top_k: Number of results to retrieve
            namespace: Pinecone namespace for session isolation

        Yields:
            StreamChunk objects (mode, citations, tokens, metrics)
        """
        try:
            # 0. Send mode indicator
            yield StreamChunk(type="mode", mode=RAGMode.HYBRID)

            # 1. Hybrid retrieval
            contexts, metrics = await self.retrieve_hybrid(query, top_k, namespace)

            # 2. Send citations
            citations = self.create_citations(contexts)
            for citation in citations:
                yield StreamChunk(type="citation", citation=citation)

            # 3. Stream response
            async for token in self.generate_response(query, contexts):
                yield StreamChunk(type="token", content=token)

            # 4. Send completion with metrics
            yield StreamChunk(type="done", metrics=metrics)

        except Exception as e:
            logger.error(f"Query processing failed: {e}")
            yield StreamChunk(type="error", content=str(e))

    async def process_query(
        self, query: str, top_k: Optional[int] = None, namespace: str = None
    ) -> Tuple[str, List[Citation], RetrievalMetrics]:
        """
        Process query and return complete response (non-streaming).

        Args:
            query: User query
            top_k: Number of results to retrieve
            namespace: Pinecone namespace for session isolation

        Returns:
            Tuple of (response text, citations, metrics)
        """
        # 1. Hybrid retrieval
        contexts, metrics = await self.retrieve_hybrid(query, top_k, namespace)

        # 2. Generate response
        response_parts = []
        async for token in self.generate_response(query, contexts):
            response_parts.append(token)
        response = "".join(response_parts)

        # 3. Create citations
        citations = self.create_citations(contexts)

        return response, citations, metrics
