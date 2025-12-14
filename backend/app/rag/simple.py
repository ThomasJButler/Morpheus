"""
Simple semantic search RAG pipeline.
Direct embedding -> vector search -> generation pattern.
"""

import logging
import time
from typing import AsyncGenerator, List, Optional

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.morpheus_prompts import get_system_prompt, get_user_prompt_template
from app.core.pinecone_client import get_pinecone_client
from app.models.chat import Citation, RetrievalMetrics, StreamChunk

logger = logging.getLogger(__name__)


class SimpleRAG:
    """
    Basic semantic search RAG implementation.

    Pipeline:
    1. Embed user query with OpenAI
    2. Search Pinecone for similar vectors
    3. Format context with retrieved chunks
    4. Generate response with Claude
    """

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.pinecone_client = get_pinecone_client()
        self.index = self.pinecone_client.get_index()

    async def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for user query.

        Args:
            query: User input text

        Returns:
            List[float]: Embedding vector (512 dimensions for small model, 1536 for large)
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
            logger.error(f"Embedding generation failed: {e}")
            raise

    async def retrieve_context(
        self, query_embedding: List[float], top_k: int = None, namespace: str = None
    ) -> tuple[List[dict], RetrievalMetrics]:
        """
        Retrieve relevant context from Pinecone.

        Args:
            query_embedding: Query vector
            top_k: Number of results to retrieve
            namespace: Pinecone namespace for session isolation

        Returns:
            Tuple of (context chunks, retrieval metrics)
        """
        start_time = time.time()
        top_k = top_k or settings.top_k_results
        # Use default namespace if not specified
        namespace = namespace or "default"

        try:
            # Query Pinecone (within namespace)
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                namespace=namespace,
                filter=None,  # Add filters if needed
            )

            # Extract matches
            matches = results.get("matches", [])

            # Filter by relevance score
            filtered_matches = [
                match
                for match in matches
                if match.score >= settings.min_relevance_score
            ]

            # Calculate metrics
            query_time = (time.time() - start_time) * 1000  # Convert to ms
            metrics = RetrievalMetrics(
                query_time_ms=query_time,
                num_results=len(filtered_matches),
                reranked=False,
                top_score=filtered_matches[0].score if filtered_matches else None,
                average_score=(
                    sum(m.score for m in filtered_matches) / len(filtered_matches)
                    if filtered_matches
                    else None
                ),
            )

            # Format context chunks
            contexts = [
                {
                    "text": match.metadata.get("text", ""),
                    "source": match.metadata.get("source", "Unknown"),
                    "page": match.metadata.get("page"),
                    "chunk_id": match.id,
                    "score": match.score,
                }
                for match in filtered_matches
            ]

            logger.info(
                f"Retrieved {len(contexts)} contexts in {query_time:.2f}ms"
            )
            return contexts, metrics

        except Exception as e:
            logger.error(f"Context retrieval failed: {e}")
            raise

    def format_context_for_prompt(self, contexts: List[dict]) -> str:
        """
        Format retrieved contexts into a prompt-friendly string.

        Args:
            contexts: List of context dictionaries

        Returns:
            str: Formatted context string
        """
        if not contexts:
            return "No relevant context found."

        formatted = []
        for i, ctx in enumerate(contexts, 1):
            source = ctx["source"]
            page = f", Page {ctx['page']}" if ctx.get("page") else ""
            text = ctx["text"]
            formatted.append(f"[Context {i}] (Source: {source}{page})\n{text}")

        return "\n\n".join(formatted)

    def create_citations(self, contexts: List[dict]) -> List[Citation]:
        """
        Create citation objects from context chunks.

        Args:
            contexts: List of context dictionaries

        Returns:
            List[Citation]: Citation objects
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
            str: Response text chunks
        """
        # Format context
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
            # Stream response from Claude
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
        Process query with streaming response.

        Args:
            query: User query
            top_k: Number of results to retrieve
            namespace: Pinecone namespace for session isolation

        Yields:
            StreamChunk: Stream chunks (tokens, citations, metrics)
        """
        try:
            # 1. Embed query
            query_embedding = await self.embed_query(query)

            # 2. Retrieve context (within namespace)
            contexts, metrics = await self.retrieve_context(query_embedding, top_k, namespace)

            # 3. Send citations
            citations = self.create_citations(contexts)
            for citation in citations:
                yield StreamChunk(type="citation", citation=citation)

            # 4. Stream response
            async for token in self.generate_response(query, contexts):
                yield StreamChunk(type="token", content=token)

            # 5. Send completion
            yield StreamChunk(type="done", metrics=metrics)

        except Exception as e:
            logger.error(f"Query processing failed: {e}")
            yield StreamChunk(type="error", content=str(e))

    async def process_query(
        self, query: str, top_k: Optional[int] = None, namespace: str = None
    ) -> tuple[str, List[Citation], RetrievalMetrics]:
        """
        Process query and return complete response (non-streaming).

        Args:
            query: User query
            top_k: Number of results to retrieve
            namespace: Pinecone namespace for session isolation

        Returns:
            Tuple of (response text, citations, metrics)
        """
        # 1. Embed query
        query_embedding = await self.embed_query(query)

        # 2. Retrieve context (within namespace)
        contexts, metrics = await self.retrieve_context(query_embedding, top_k, namespace)

        # 3. Generate response
        response_parts = []
        async for token in self.generate_response(query, contexts):
            response_parts.append(token)
        response = "".join(response_parts)

        # 4. Create citations
        citations = self.create_citations(contexts)

        return response, citations, metrics
