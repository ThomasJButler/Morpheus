"""
RAG Orchestrator - Central controller for tiered RAG system.

Manages routing between SimpleRAG, HybridRAG, and AgenticRAG based on
query analysis, with support for auto-escalation and evaluation loops.
"""

import asyncio
import logging
import time
from typing import AsyncGenerator, List, Optional, Tuple

from app.core.config import settings
from app.models.chat import (
    Citation,
    EnhancedRetrievalMetrics,
    QueryAnalysis,
    RAGMode,
    ReflectionResult,
    RetrievalMetrics,
    StreamChunk,
)
from app.rag.simple import SimpleRAG
from app.rag.hybrid import HybridRAG
from app.rag.agentic import AgenticRAG
from app.rag.query_analyzer import QueryAnalyzer

logger = logging.getLogger(__name__)


class RAGOrchestrator:
    """
    Central controller for all RAG modes with 2025 patterns.

    Features:
    - Intelligent routing via QueryAnalyzer
    - Auto-escalation on low confidence
    - Evaluation loops for quality assurance
    - Unified streaming interface
    """

    def __init__(self):
        self.simple_rag = SimpleRAG()
        self.hybrid_rag = HybridRAG()
        self.agentic_rag = AgenticRAG()
        self.query_analyzer = QueryAnalyzer()

        logger.info("RAGOrchestrator initialized with all RAG modes")

    async def process_query(
        self,
        query: str,
        mode: RAGMode = RAGMode.AUTO,
        namespace: str = None,
        deep_mode: bool = False,
        return_analysis: bool = False,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Process query with appropriate RAG mode.

        If mode is AUTO, analyze and route intelligently.
        If deep_mode is True, force AgenticRAG for thorough search.

        Args:
            query: User query
            mode: RAG mode (simple/hybrid/agentic/auto)
            namespace: Pinecone namespace for session isolation
            deep_mode: Force agentic mode for complex queries
            return_analysis: Include query analysis in stream

        Yields:
            StreamChunk objects
        """
        start_time = time.time()
        namespace = namespace or "default"
        analysis = None

        try:
            # Deep mode overrides everything
            if deep_mode:
                mode = RAGMode.AGENTIC
                logger.info("Deep mode enabled - using AgenticRAG")
            elif mode == RAGMode.AUTO:
                # Analyze query for intelligent routing
                analysis = await self.query_analyzer.analyze(query)
                mode = analysis.suggested_mode
                logger.info(f"Auto-routing to {mode.value}: {analysis.reasoning}")

            # Send analysis if requested
            if return_analysis and analysis:
                yield StreamChunk(type="analysis", analysis=analysis)

            # Route to appropriate RAG implementation
            if mode == RAGMode.SIMPLE:
                async for chunk in self._process_simple(query, namespace):
                    yield chunk
            elif mode == RAGMode.HYBRID:
                async for chunk in self._process_hybrid(query, namespace):
                    yield chunk
            elif mode == RAGMode.AGENTIC:
                async for chunk in self._process_agentic(query, namespace):
                    yield chunk
            else:
                # Fallback to simple
                async for chunk in self._process_simple(query, namespace):
                    yield chunk

        except Exception as e:
            logger.error(f"Orchestrator processing failed: {e}", exc_info=True)
            yield StreamChunk(type="error", content=str(e))

    async def _process_simple(
        self, query: str, namespace: str
    ) -> AsyncGenerator[StreamChunk, None]:
        """Process with SimpleRAG."""
        yield StreamChunk(type="mode", mode=RAGMode.SIMPLE)
        async for chunk in self.simple_rag.process_query_streaming(
            query, namespace=namespace
        ):
            yield chunk

    async def _process_hybrid(
        self, query: str, namespace: str
    ) -> AsyncGenerator[StreamChunk, None]:
        """Process with HybridRAG."""
        async for chunk in self.hybrid_rag.process_query_streaming(
            query, namespace=namespace
        ):
            yield chunk

    async def _process_agentic(
        self, query: str, namespace: str
    ) -> AsyncGenerator[StreamChunk, None]:
        """Process with AgenticRAG."""
        async for chunk in self.agentic_rag.process_query_streaming(
            query, namespace=namespace
        ):
            yield chunk

    async def process_with_auto_escalation(
        self,
        query: str,
        namespace: str = None,
        confidence_threshold: float = 0.6,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Smart escalation based on retrieval confidence.

        Flow:
        1. Try SimpleRAG first (fast)
        2. Evaluate confidence
        3. If confidence < threshold → Escalate to HybridRAG
        4. If still low → Escalate to AgenticRAG
        5. Return best result with escalation metadata

        Args:
            query: User query
            namespace: Pinecone namespace
            confidence_threshold: Minimum confidence to accept result

        Yields:
            StreamChunk objects
        """
        namespace = namespace or "default"
        current_mode = RAGMode.SIMPLE

        # Try SimpleRAG first
        yield StreamChunk(type="mode", mode=RAGMode.SIMPLE)

        response_parts = []
        citations = []
        metrics = None

        async for chunk in self.simple_rag.process_query_streaming(
            query, namespace=namespace
        ):
            if chunk.type == "token":
                response_parts.append(chunk.content)
                yield chunk
            elif chunk.type == "citation":
                citations.append(chunk.citation)
                yield chunk
            elif chunk.type == "done":
                metrics = chunk.metrics

        # Evaluate confidence based on retrieval metrics
        if metrics:
            confidence = self._evaluate_confidence(metrics, citations)

            if confidence < confidence_threshold:
                logger.info(
                    f"SimpleRAG confidence ({confidence:.2f}) below threshold "
                    f"({confidence_threshold}), escalating to HybridRAG"
                )

                # Clear and try HybridRAG
                yield StreamChunk(
                    type="mode",
                    mode=RAGMode.HYBRID,
                    content="Escalating for better results...",
                )

                response_parts = []
                citations = []

                async for chunk in self.hybrid_rag.process_query_streaming(
                    query, namespace=namespace
                ):
                    if chunk.type == "token":
                        response_parts.append(chunk.content)
                        yield chunk
                    elif chunk.type == "citation":
                        citations.append(chunk.citation)
                        yield chunk
                    elif chunk.type == "done":
                        metrics = chunk.metrics
                        current_mode = RAGMode.HYBRID

                # Re-evaluate
                confidence = self._evaluate_confidence(metrics, citations)

                if confidence < confidence_threshold:
                    logger.info(
                        f"HybridRAG confidence ({confidence:.2f}) still below "
                        f"threshold, escalating to AgenticRAG"
                    )

                    yield StreamChunk(
                        type="mode",
                        mode=RAGMode.AGENTIC,
                        content="Deep diving for comprehensive answer...",
                    )

                    response_parts = []
                    citations = []

                    async for chunk in self.agentic_rag.process_query_streaming(
                        query, namespace=namespace
                    ):
                        if chunk.type == "token":
                            response_parts.append(chunk.content)
                            yield chunk
                        elif chunk.type == "citation":
                            citations.append(chunk.citation)
                            yield chunk
                        elif chunk.type == "done":
                            metrics = chunk.metrics
                            current_mode = RAGMode.AGENTIC

        # Send final done with escalation info
        yield StreamChunk(type="done", metrics=metrics)

    def _evaluate_confidence(
        self, metrics: RetrievalMetrics, citations: List[Citation]
    ) -> float:
        """
        Evaluate retrieval confidence based on metrics.

        Factors:
        - Number of results retrieved
        - Top relevance score
        - Average relevance score
        - Citation diversity
        """
        if not metrics:
            return 0.0

        confidence = 0.0

        # Number of results (more is generally better, up to a point)
        if metrics.num_results >= 5:
            confidence += 0.25
        elif metrics.num_results >= 3:
            confidence += 0.15
        elif metrics.num_results >= 1:
            confidence += 0.05

        # Top score (higher is better)
        if metrics.top_score:
            if metrics.top_score >= 0.8:
                confidence += 0.35
            elif metrics.top_score >= 0.6:
                confidence += 0.25
            elif metrics.top_score >= 0.4:
                confidence += 0.15

        # Average score
        if metrics.average_score:
            if metrics.average_score >= 0.6:
                confidence += 0.25
            elif metrics.average_score >= 0.4:
                confidence += 0.15
            elif metrics.average_score >= 0.3:
                confidence += 0.05

        # Citation diversity (unique sources)
        if citations:
            unique_sources = len(set(c.source for c in citations))
            if unique_sources >= 3:
                confidence += 0.15
            elif unique_sources >= 2:
                confidence += 0.10

        return min(confidence, 1.0)

    async def process_with_reflection(
        self,
        query: str,
        namespace: str = None,
        mode: RAGMode = RAGMode.AUTO,
        confidence_threshold: float = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Process query with agent reflection for quality assurance.

        Combines mode selection with AgenticRAG's reflection capability
        to ensure response quality meets the threshold.

        Flow:
        1. Route to appropriate RAG mode
        2. If using AgenticRAG, apply reflection
        3. If reflection indicates low confidence and more search needed,
           yield reflection metadata and potentially improved response

        Args:
            query: User query
            namespace: Pinecone namespace
            mode: RAG mode (default: AUTO for intelligent routing)
            confidence_threshold: Minimum confidence (uses config default if not set)

        Yields:
            StreamChunk objects including reflection results
        """
        namespace = namespace or "default"
        confidence_threshold = (
            confidence_threshold or settings.reflection_min_confidence
        )

        # Determine mode
        analysis = None
        if mode == RAGMode.AUTO:
            analysis = await self.query_analyzer.analyze(query)
            mode = analysis.suggested_mode
            logger.info(f"Auto-routing to {mode.value} with reflection enabled")

        # Send analysis if available
        if analysis:
            yield StreamChunk(type="analysis", analysis=analysis)

        # If using AgenticRAG, use its reflection capability
        if mode == RAGMode.AGENTIC and settings.enable_reflection:
            yield StreamChunk(type="mode", mode=RAGMode.AGENTIC)

            # Use AgenticRAG with reflection
            response, citations, metrics, reflection = (
                await self.agentic_rag.process_query_with_reflection(
                    query=query,
                    namespace=namespace,
                    min_confidence=confidence_threshold,
                )
            )

            # Yield citations
            for citation in citations:
                yield StreamChunk(type="citation", citation=citation)

            # Yield response tokens
            for token in response:
                yield StreamChunk(type="token", content=token)

            # Yield reflection result
            yield StreamChunk(
                type="reflection",
                content=reflection.model_dump_json(),
            )

            # Create enhanced metrics with reflection info
            enhanced_metrics = EnhancedRetrievalMetrics(
                query_time_ms=metrics.query_time_ms,
                num_results=metrics.num_results,
                reranked=metrics.reranked,
                top_score=metrics.top_score,
                average_score=metrics.average_score,
                mode_used=RAGMode.AGENTIC,
                mode_confidence=reflection.confidence_score,
            )

            yield StreamChunk(type="done", metrics=enhanced_metrics)

        else:
            # For non-agentic modes, process normally
            async for chunk in self.process_query(
                query=query,
                mode=mode,
                namespace=namespace,
            ):
                yield chunk

    async def process_with_smart_escalation(
        self,
        query: str,
        namespace: str = None,
        initial_mode: RAGMode = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Smart escalation combining metrics-based and reflection-based evaluation.

        This is an enhanced version of process_with_auto_escalation that:
        1. Uses query analysis to pick initial mode
        2. Evaluates confidence from retrieval metrics
        3. Uses AgenticRAG reflection for final quality check
        4. Tracks escalation path in metadata

        Args:
            query: User query
            namespace: Pinecone namespace
            initial_mode: Starting mode (default: determined by query analysis)

        Yields:
            StreamChunk objects with escalation metadata
        """
        namespace = namespace or "default"
        escalation_path = []
        start_time = time.time()

        # Determine initial mode via analysis
        analysis = await self.query_analyzer.analyze(query)
        current_mode = initial_mode or analysis.suggested_mode

        # Cap initial mode at HYBRID if we want escalation potential
        if current_mode == RAGMode.AGENTIC and not initial_mode:
            # Start lower to allow escalation
            current_mode = (
                RAGMode.SIMPLE if analysis.complexity_score < 0.5 else RAGMode.HYBRID
            )

        escalation_path.append(current_mode)
        yield StreamChunk(type="analysis", analysis=analysis)
        yield StreamChunk(type="mode", mode=current_mode)

        # Process with current mode
        response_parts = []
        citations = []
        metrics = None

        if current_mode == RAGMode.SIMPLE:
            async for chunk in self.simple_rag.process_query_streaming(
                query, namespace=namespace
            ):
                if chunk.type == "token":
                    response_parts.append(chunk.content)
                    yield chunk
                elif chunk.type == "citation":
                    citations.append(chunk.citation)
                    yield chunk
                elif chunk.type == "done":
                    metrics = chunk.metrics
        elif current_mode == RAGMode.HYBRID:
            async for chunk in self.hybrid_rag.process_query_streaming(
                query, namespace=namespace
            ):
                if chunk.type == "token":
                    response_parts.append(chunk.content)
                    yield chunk
                elif chunk.type == "citation":
                    citations.append(chunk.citation)
                    yield chunk
                elif chunk.type == "done":
                    metrics = chunk.metrics

        # Evaluate confidence
        confidence = self._evaluate_confidence(metrics, citations) if metrics else 0.0

        # Escalate if needed
        if (
            confidence < settings.reflection_min_confidence
            and current_mode != RAGMode.AGENTIC
        ):
            # Try next tier
            if current_mode == RAGMode.SIMPLE:
                next_mode = RAGMode.HYBRID
            else:
                next_mode = RAGMode.AGENTIC

            escalation_path.append(next_mode)
            logger.info(
                f"Escalating from {current_mode.value} to {next_mode.value} "
                f"(confidence: {confidence:.2f})"
            )

            yield StreamChunk(
                type="mode",
                mode=next_mode,
                content=f"Escalating from {current_mode.value} for better results...",
            )

            # Clear and retry
            response_parts = []
            citations = []

            if next_mode == RAGMode.HYBRID:
                async for chunk in self.hybrid_rag.process_query_streaming(
                    query, namespace=namespace
                ):
                    if chunk.type == "token":
                        response_parts.append(chunk.content)
                        yield chunk
                    elif chunk.type == "citation":
                        citations.append(chunk.citation)
                        yield chunk
                    elif chunk.type == "done":
                        metrics = chunk.metrics
                        current_mode = next_mode
            else:
                # AgenticRAG with reflection
                response, citations_list, metrics, reflection = (
                    await self.agentic_rag.process_query_with_reflection(
                        query=query,
                        namespace=namespace,
                    )
                )
                for citation in citations_list:
                    citations.append(citation)
                    yield StreamChunk(type="citation", citation=citation)
                for token in response:
                    response_parts.append(token)
                    yield StreamChunk(type="token", content=token)

                yield StreamChunk(
                    type="reflection",
                    content=reflection.model_dump_json(),
                )
                current_mode = next_mode
                confidence = reflection.confidence_score

        # Final metrics with escalation info
        total_time = (time.time() - start_time) * 1000
        final_metrics = EnhancedRetrievalMetrics(
            query_time_ms=total_time,
            num_results=metrics.num_results if metrics else 0,
            reranked=metrics.reranked if metrics else False,
            top_score=metrics.top_score if metrics else None,
            average_score=metrics.average_score if metrics else None,
            mode_used=current_mode,
            mode_confidence=confidence,
            escalated_from=escalation_path[0] if len(escalation_path) > 1 else None,
            escalation_reason=(
                f"Confidence below threshold" if len(escalation_path) > 1 else None
            ),
        )

        yield StreamChunk(type="done", metrics=final_metrics)

    async def process_with_hyde(
        self,
        query: str,
        namespace: str = None,
        mode: RAGMode = RAGMode.SIMPLE,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Process query using HyDE (Hypothetical Document Embeddings).

        Instead of embedding the query, we:
        1. Generate a hypothetical answer
        2. Embed that answer
        3. Search for similar real documents

        This improves recall for vague or how-to queries.

        Args:
            query: User query
            namespace: Pinecone namespace
            mode: Which RAG to use after HyDE embedding

        Yields:
            StreamChunk objects
        """
        namespace = namespace or "default"

        try:
            # Generate HyDE embedding
            hyde_embedding = await self.query_analyzer.embed_hyde_document(query)

            # Use HyDE embedding with SimpleRAG's retrieval
            # (Custom flow - SimpleRAG with pre-computed embedding)
            contexts, metrics = await self.simple_rag.retrieve_context(
                hyde_embedding, namespace=namespace
            )

            # Send mode
            yield StreamChunk(type="mode", mode=mode, content="Using HyDE enhancement")

            # Send citations
            citations = self.simple_rag.create_citations(contexts)
            for citation in citations:
                yield StreamChunk(type="citation", citation=citation)

            # Generate response
            async for token in self.simple_rag.generate_response(query, contexts):
                yield StreamChunk(type="token", content=token)

            yield StreamChunk(type="done", metrics=metrics)

        except Exception as e:
            logger.error(f"HyDE processing failed: {e}")
            # Fallback to regular processing
            async for chunk in self.process_query(query, mode, namespace):
                yield chunk


# Singleton instance
_orchestrator: Optional[RAGOrchestrator] = None


def get_orchestrator() -> RAGOrchestrator:
    """Get singleton RAGOrchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = RAGOrchestrator()
    return _orchestrator
