"""
Tests for RAGOrchestrator - central controller for tiered RAG system.
Tests routing, auto-escalation, confidence evaluation, and HyDE processing.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.rag.orchestrator import RAGOrchestrator, get_orchestrator
from app.models.chat import (
    Citation,
    QueryAnalysis,
    QueryType,
    RAGMode,
    RetrievalMetrics,
    StreamChunk,
)


class TestRAGOrchestratorInit:
    """Tests for RAGOrchestrator initialization."""

    def test_orchestrator_initializes_all_components(self):
        """Test orchestrator initializes all RAG modes and analyzer."""
        with patch("app.rag.orchestrator.SimpleRAG") as mock_simple:
            with patch("app.rag.orchestrator.HybridRAG") as mock_hybrid:
                with patch("app.rag.orchestrator.AgenticRAG") as mock_agentic:
                    with patch("app.rag.orchestrator.QueryAnalyzer") as mock_analyzer:
                        orchestrator = RAGOrchestrator()

        assert orchestrator.simple_rag is not None
        assert orchestrator.hybrid_rag is not None
        assert orchestrator.agentic_rag is not None
        assert orchestrator.query_analyzer is not None


class TestRAGOrchestratorRouting:
    """Tests for mode routing logic."""

    @pytest.fixture
    def mock_orchestrator(self):
        """Create orchestrator with mocked RAG implementations."""
        with patch("app.rag.orchestrator.SimpleRAG") as mock_simple:
            with patch("app.rag.orchestrator.HybridRAG") as mock_hybrid:
                with patch("app.rag.orchestrator.AgenticRAG") as mock_agentic:
                    with patch("app.rag.orchestrator.QueryAnalyzer") as mock_analyzer:
                        orchestrator = RAGOrchestrator()

                        # Set up mock streaming generators
                        async def simple_stream(*args, **kwargs):
                            yield StreamChunk(type="mode", mode=RAGMode.SIMPLE)
                            yield StreamChunk(type="token", content="Simple response")
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=100, num_results=5, reranked=False
                                ),
                            )

                        async def hybrid_stream(*args, **kwargs):
                            yield StreamChunk(type="mode", mode=RAGMode.HYBRID)
                            yield StreamChunk(type="token", content="Hybrid response")
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=200, num_results=8, reranked=True
                                ),
                            )

                        async def agentic_stream(*args, **kwargs):
                            yield StreamChunk(type="mode", mode=RAGMode.AGENTIC)
                            yield StreamChunk(type="token", content="Agentic response")
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=500, num_results=10, reranked=True
                                ),
                            )

                        orchestrator.simple_rag.process_query_streaming = simple_stream
                        orchestrator.hybrid_rag.process_query_streaming = hybrid_stream
                        orchestrator.agentic_rag.process_query_streaming = (
                            agentic_stream
                        )

                        return orchestrator

    @pytest.mark.asyncio
    async def test_explicit_simple_mode(self, mock_orchestrator):
        """Test explicit simple mode routes to SimpleRAG."""
        chunks = []
        async for chunk in mock_orchestrator.process_query(
            "What is RAG?", mode=RAGMode.SIMPLE
        ):
            chunks.append(chunk)

        modes = [c.mode for c in chunks if c.type == "mode"]
        assert RAGMode.SIMPLE in modes

    @pytest.mark.asyncio
    async def test_explicit_hybrid_mode(self, mock_orchestrator):
        """Test explicit hybrid mode routes to HybridRAG."""
        chunks = []
        async for chunk in mock_orchestrator.process_query(
            "Compare RAG vs fine-tuning", mode=RAGMode.HYBRID
        ):
            chunks.append(chunk)

        modes = [c.mode for c in chunks if c.type == "mode"]
        assert RAGMode.HYBRID in modes

    @pytest.mark.asyncio
    async def test_explicit_agentic_mode(self, mock_orchestrator):
        """Test explicit agentic mode routes to AgenticRAG."""
        chunks = []
        async for chunk in mock_orchestrator.process_query(
            "Research this topic", mode=RAGMode.AGENTIC
        ):
            chunks.append(chunk)

        modes = [c.mode for c in chunks if c.type == "mode"]
        assert RAGMode.AGENTIC in modes

    @pytest.mark.asyncio
    async def test_deep_mode_forces_agentic(self, mock_orchestrator):
        """Test deep_mode=True forces AgenticRAG regardless of other settings."""
        chunks = []
        async for chunk in mock_orchestrator.process_query(
            "Simple question",
            mode=RAGMode.SIMPLE,  # Would normally use simple
            deep_mode=True,  # But deep mode overrides
        ):
            chunks.append(chunk)

        modes = [c.mode for c in chunks if c.type == "mode"]
        assert RAGMode.AGENTIC in modes

    @pytest.mark.asyncio
    async def test_auto_mode_uses_analyzer(self, mock_orchestrator):
        """Test AUTO mode calls query analyzer for routing."""
        # Mock analyzer to return a specific analysis
        mock_analysis = QueryAnalysis(
            complexity_score=0.5,
            query_type=QueryType.COMPARATIVE,
            suggested_mode=RAGMode.HYBRID,
            keywords=["rag", "finetune"],
            is_ambiguous=False,
            needs_rewriting=False,
            reasoning="Comparative query",
        )
        mock_orchestrator.query_analyzer.analyze = AsyncMock(return_value=mock_analysis)

        chunks = []
        async for chunk in mock_orchestrator.process_query(
            "What's the difference?", mode=RAGMode.AUTO
        ):
            chunks.append(chunk)

        # Analyzer should have been called
        mock_orchestrator.query_analyzer.analyze.assert_called_once()

        # Should route to hybrid based on analysis
        modes = [c.mode for c in chunks if c.type == "mode"]
        assert RAGMode.HYBRID in modes

    @pytest.mark.asyncio
    async def test_return_analysis_includes_analysis_chunk(self, mock_orchestrator):
        """Test return_analysis=True includes analysis in stream."""
        mock_analysis = QueryAnalysis(
            complexity_score=0.3,
            query_type=QueryType.FACTUAL,
            suggested_mode=RAGMode.SIMPLE,
            keywords=["test"],
            is_ambiguous=False,
            needs_rewriting=False,
            reasoning="Simple factual query",
        )
        mock_orchestrator.query_analyzer.analyze = AsyncMock(return_value=mock_analysis)

        chunks = []
        async for chunk in mock_orchestrator.process_query(
            "What is RAG?", mode=RAGMode.AUTO, return_analysis=True
        ):
            chunks.append(chunk)

        analysis_chunks = [c for c in chunks if c.type == "analysis"]
        assert len(analysis_chunks) == 1
        assert analysis_chunks[0].analysis == mock_analysis


class TestRAGOrchestratorConfidence:
    """Tests for confidence evaluation."""

    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator for confidence tests."""
        with patch("app.rag.orchestrator.SimpleRAG"):
            with patch("app.rag.orchestrator.HybridRAG"):
                with patch("app.rag.orchestrator.AgenticRAG"):
                    with patch("app.rag.orchestrator.QueryAnalyzer"):
                        return RAGOrchestrator()

    def test_no_metrics_returns_zero_confidence(self, orchestrator):
        """Test None metrics returns 0 confidence."""
        result = orchestrator._evaluate_confidence(None, [])
        assert result == 0.0

    def test_high_results_adds_confidence(self, orchestrator):
        """Test 5+ results adds 0.25 confidence."""
        metrics = RetrievalMetrics(
            query_time_ms=100,
            num_results=5,
            reranked=False,
            top_score=None,
            average_score=None,
        )
        result = orchestrator._evaluate_confidence(metrics, [])
        assert result >= 0.25

    def test_medium_results_adds_confidence(self, orchestrator):
        """Test 3-4 results adds 0.15 confidence."""
        metrics = RetrievalMetrics(
            query_time_ms=100,
            num_results=3,
            reranked=False,
            top_score=None,
            average_score=None,
        )
        result = orchestrator._evaluate_confidence(metrics, [])
        assert result >= 0.15

    def test_low_results_adds_minimal_confidence(self, orchestrator):
        """Test 1-2 results adds 0.05 confidence."""
        metrics = RetrievalMetrics(
            query_time_ms=100,
            num_results=1,
            reranked=False,
            top_score=None,
            average_score=None,
        )
        result = orchestrator._evaluate_confidence(metrics, [])
        assert result >= 0.05

    def test_high_top_score_adds_confidence(self, orchestrator):
        """Test top_score >= 0.8 adds 0.35 confidence."""
        metrics = RetrievalMetrics(
            query_time_ms=100,
            num_results=0,
            reranked=False,
            top_score=0.85,
            average_score=None,
        )
        result = orchestrator._evaluate_confidence(metrics, [])
        assert result >= 0.35

    def test_high_average_score_adds_confidence(self, orchestrator):
        """Test average_score >= 0.6 adds 0.25 confidence."""
        metrics = RetrievalMetrics(
            query_time_ms=100,
            num_results=0,
            reranked=False,
            top_score=None,
            average_score=0.65,
        )
        result = orchestrator._evaluate_confidence(metrics, [])
        assert result >= 0.25

    def test_diverse_citations_adds_confidence(self, orchestrator):
        """Test 3+ unique sources adds 0.15 confidence."""
        metrics = RetrievalMetrics(query_time_ms=100, num_results=0, reranked=False)
        citations = [
            Citation(source="doc1.pdf", relevance_score=0.8, text_preview="..."),
            Citation(source="doc2.pdf", relevance_score=0.7, text_preview="..."),
            Citation(source="doc3.pdf", relevance_score=0.6, text_preview="..."),
        ]
        result = orchestrator._evaluate_confidence(metrics, citations)
        assert result >= 0.15

    def test_excellent_metrics_high_confidence(self, orchestrator):
        """Test combined excellent metrics gives high confidence."""
        metrics = RetrievalMetrics(
            query_time_ms=100,
            num_results=7,  # +0.25
            reranked=True,
            top_score=0.9,  # +0.35
            average_score=0.7,  # +0.25
        )
        citations = [
            Citation(source="doc1.pdf", relevance_score=0.9, text_preview="..."),
            Citation(source="doc2.pdf", relevance_score=0.8, text_preview="..."),
            Citation(source="doc3.pdf", relevance_score=0.7, text_preview="..."),
        ]
        # Should be 0.25 + 0.35 + 0.25 + 0.15 = 1.0
        result = orchestrator._evaluate_confidence(metrics, citations)
        assert result >= 0.9

    def test_confidence_capped_at_one(self, orchestrator):
        """Test confidence never exceeds 1.0."""
        metrics = RetrievalMetrics(
            query_time_ms=50,
            num_results=10,
            reranked=True,
            top_score=0.99,
            average_score=0.9,
        )
        citations = [
            Citation(source=f"doc{i}.pdf", relevance_score=0.9, text_preview="...")
            for i in range(10)
        ]
        result = orchestrator._evaluate_confidence(metrics, citations)
        assert result <= 1.0


class TestRAGOrchestratorAutoEscalation:
    """Tests for auto-escalation functionality."""

    @pytest.fixture
    def mock_orchestrator(self):
        """Create orchestrator with controllable confidence."""
        with patch("app.rag.orchestrator.SimpleRAG") as mock_simple:
            with patch("app.rag.orchestrator.HybridRAG") as mock_hybrid:
                with patch("app.rag.orchestrator.AgenticRAG") as mock_agentic:
                    with patch("app.rag.orchestrator.QueryAnalyzer"):
                        orchestrator = RAGOrchestrator()

                        # Create streaming functions with specific metrics
                        async def low_confidence_stream(*args, **kwargs):
                            yield StreamChunk(type="token", content="Low confidence")
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=100,
                                    num_results=1,  # Low result count
                                    reranked=False,
                                    top_score=0.3,  # Low score
                                    average_score=0.2,
                                ),
                            )

                        async def medium_confidence_stream(*args, **kwargs):
                            yield StreamChunk(type="token", content="Medium confidence")
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=200,
                                    num_results=3,
                                    reranked=True,
                                    top_score=0.55,
                                    average_score=0.45,
                                ),
                            )

                        async def high_confidence_stream(*args, **kwargs):
                            yield StreamChunk(type="token", content="High confidence")
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=300,
                                    num_results=8,
                                    reranked=True,
                                    top_score=0.9,
                                    average_score=0.7,
                                ),
                            )

                        orchestrator.simple_rag.process_query_streaming = (
                            low_confidence_stream
                        )
                        orchestrator.hybrid_rag.process_query_streaming = (
                            medium_confidence_stream
                        )
                        orchestrator.agentic_rag.process_query_streaming = (
                            high_confidence_stream
                        )

                        return orchestrator

    @pytest.mark.asyncio
    async def test_starts_with_simple_mode(self, mock_orchestrator):
        """Test auto-escalation starts with SimpleRAG."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_auto_escalation(
            "Test query", confidence_threshold=0.1  # Very low threshold
        ):
            chunks.append(chunk)

        mode_chunks = [c for c in chunks if c.type == "mode"]
        assert mode_chunks[0].mode == RAGMode.SIMPLE

    @pytest.mark.asyncio
    async def test_escalates_to_hybrid_on_low_confidence(self, mock_orchestrator):
        """Test escalates to HybridRAG when SimpleRAG confidence is low."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_auto_escalation(
            "Complex query", confidence_threshold=0.5
        ):
            chunks.append(chunk)

        modes = [c.mode for c in chunks if c.type == "mode" and c.mode is not None]
        # Should have escalated: Simple → Hybrid
        assert RAGMode.SIMPLE in modes
        assert RAGMode.HYBRID in modes

    @pytest.mark.asyncio
    async def test_escalates_to_agentic_on_continued_low_confidence(
        self, mock_orchestrator
    ):
        """Test escalates to AgenticRAG when HybridRAG confidence is also low."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_auto_escalation(
            "Very complex query", confidence_threshold=0.8  # High threshold
        ):
            chunks.append(chunk)

        modes = [c.mode for c in chunks if c.type == "mode" and c.mode is not None]
        # Should have escalated through all: Simple → Hybrid → Agentic
        assert RAGMode.SIMPLE in modes
        assert RAGMode.HYBRID in modes
        assert RAGMode.AGENTIC in modes

    @pytest.mark.asyncio
    async def test_returns_done_chunk_at_end(self, mock_orchestrator):
        """Test always returns done chunk at end."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_auto_escalation("Test"):
            chunks.append(chunk)

        done_chunks = [c for c in chunks if c.type == "done"]
        assert len(done_chunks) >= 1


class TestRAGOrchestratorHyDE:
    """Tests for HyDE (Hypothetical Document Embeddings) processing."""

    @pytest.fixture
    def mock_orchestrator(self):
        """Create orchestrator with mocked HyDE dependencies."""
        with patch("app.rag.orchestrator.SimpleRAG") as mock_simple:
            with patch("app.rag.orchestrator.HybridRAG"):
                with patch("app.rag.orchestrator.AgenticRAG"):
                    with patch("app.rag.orchestrator.QueryAnalyzer") as mock_analyzer:
                        orchestrator = RAGOrchestrator()

                        # Mock analyzer HyDE methods
                        orchestrator.query_analyzer.embed_hyde_document = AsyncMock(
                            return_value=[0.1] * 512
                        )

                        # Mock SimpleRAG retrieval and generation
                        orchestrator.simple_rag.retrieve_context = AsyncMock(
                            return_value=(
                                [{"text": "Retrieved context", "source": "doc.pdf"}],
                                RetrievalMetrics(
                                    query_time_ms=100, num_results=1, reranked=False
                                ),
                            )
                        )
                        orchestrator.simple_rag.create_citations = MagicMock(
                            return_value=[
                                Citation(
                                    source="doc.pdf",
                                    relevance_score=0.8,
                                    text_preview="Preview...",
                                )
                            ]
                        )

                        async def generate(*args, **kwargs):
                            yield "Generated "
                            yield "response"

                        orchestrator.simple_rag.generate_response = generate

                        return orchestrator

    @pytest.mark.asyncio
    async def test_hyde_calls_embed_hyde_document(self, mock_orchestrator):
        """Test HyDE processing calls embed_hyde_document."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_hyde("What is RAG?"):
            chunks.append(chunk)

        mock_orchestrator.query_analyzer.embed_hyde_document.assert_called_once_with(
            "What is RAG?"
        )

    @pytest.mark.asyncio
    async def test_hyde_returns_mode_chunk(self, mock_orchestrator):
        """Test HyDE returns mode chunk indicating enhancement."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_hyde("Test query"):
            chunks.append(chunk)

        mode_chunks = [c for c in chunks if c.type == "mode"]
        assert len(mode_chunks) >= 1
        # Should indicate HyDE enhancement in content
        assert any("HyDE" in (c.content or "") for c in mode_chunks)

    @pytest.mark.asyncio
    async def test_hyde_returns_citations(self, mock_orchestrator):
        """Test HyDE returns citations from retrieval."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_hyde("Test query"):
            chunks.append(chunk)

        citation_chunks = [c for c in chunks if c.type == "citation"]
        assert len(citation_chunks) >= 1

    @pytest.mark.asyncio
    async def test_hyde_returns_tokens(self, mock_orchestrator):
        """Test HyDE streams response tokens."""
        chunks = []
        async for chunk in mock_orchestrator.process_with_hyde("Test query"):
            chunks.append(chunk)

        token_chunks = [c for c in chunks if c.type == "token"]
        assert len(token_chunks) >= 1
        all_tokens = "".join(c.content for c in token_chunks)
        assert "Generated response" in all_tokens

    @pytest.mark.asyncio
    async def test_hyde_fallback_on_error(self, mock_orchestrator):
        """Test HyDE falls back to regular processing on error."""
        # Make HyDE fail
        mock_orchestrator.query_analyzer.embed_hyde_document = AsyncMock(
            side_effect=Exception("HyDE failed")
        )

        # Mock regular process_query to verify fallback
        async def fallback_stream(*args, **kwargs):
            yield StreamChunk(type="mode", mode=RAGMode.SIMPLE)
            yield StreamChunk(type="token", content="Fallback")
            yield StreamChunk(type="done")

        mock_orchestrator.simple_rag.process_query_streaming = fallback_stream

        chunks = []
        async for chunk in mock_orchestrator.process_with_hyde("Test query"):
            chunks.append(chunk)

        # Should have fallback response
        token_chunks = [c for c in chunks if c.type == "token"]
        assert any("Fallback" in (c.content or "") for c in token_chunks)


class TestGetOrchestrator:
    """Tests for singleton orchestrator factory."""

    def test_get_orchestrator_returns_instance(self):
        """Test get_orchestrator returns RAGOrchestrator."""
        with patch("app.rag.orchestrator.SimpleRAG"):
            with patch("app.rag.orchestrator.HybridRAG"):
                with patch("app.rag.orchestrator.AgenticRAG"):
                    with patch("app.rag.orchestrator.QueryAnalyzer"):
                        # Reset singleton
                        import app.rag.orchestrator as orch_module

                        orch_module._orchestrator = None

                        result = get_orchestrator()
                        assert isinstance(result, RAGOrchestrator)

    def test_get_orchestrator_returns_same_instance(self):
        """Test get_orchestrator returns singleton."""
        with patch("app.rag.orchestrator.SimpleRAG"):
            with patch("app.rag.orchestrator.HybridRAG"):
                with patch("app.rag.orchestrator.AgenticRAG"):
                    with patch("app.rag.orchestrator.QueryAnalyzer"):
                        # Reset singleton
                        import app.rag.orchestrator as orch_module

                        orch_module._orchestrator = None

                        first = get_orchestrator()
                        second = get_orchestrator()
                        assert first is second


class TestRAGOrchestratorErrorHandling:
    """Tests for error handling."""

    @pytest.fixture
    def error_orchestrator(self):
        """Create orchestrator that will throw errors."""
        with patch("app.rag.orchestrator.SimpleRAG") as mock_simple:
            with patch("app.rag.orchestrator.HybridRAG"):
                with patch("app.rag.orchestrator.AgenticRAG"):
                    with patch("app.rag.orchestrator.QueryAnalyzer"):
                        orchestrator = RAGOrchestrator()

                        # Make simple_rag throw an error via async generator
                        async def error_stream(*args, **kwargs):
                            raise Exception("Simulated error")
                            # This is unreachable but makes it an async generator
                            yield  # noqa: This line is never reached

                        orchestrator.simple_rag.process_query_streaming = error_stream

                        return orchestrator

    @pytest.mark.asyncio
    async def test_handles_rag_errors_gracefully(self, error_orchestrator):
        """Test errors are caught and returned as error chunks."""
        chunks = []
        async for chunk in error_orchestrator.process_query(
            "Test query", mode=RAGMode.SIMPLE
        ):
            chunks.append(chunk)

        error_chunks = [c for c in chunks if c.type == "error"]
        assert len(error_chunks) >= 1
        assert "Simulated error" in error_chunks[0].content


class TestRAGOrchestratorWithReflection:
    """Tests for process_with_reflection method."""

    @pytest.fixture
    def reflection_orchestrator(self):
        """Create orchestrator with reflection capability."""
        with patch("app.rag.orchestrator.SimpleRAG"):
            with patch("app.rag.orchestrator.HybridRAG"):
                with patch("app.rag.orchestrator.AgenticRAG") as mock_agentic:
                    with patch("app.rag.orchestrator.QueryAnalyzer") as mock_analyzer:
                        orchestrator = RAGOrchestrator()

                        # Mock analyzer to recommend AGENTIC mode
                        mock_analysis = MagicMock()
                        mock_analysis.suggested_mode = RAGMode.AGENTIC
                        mock_analysis.complexity_score = 0.8
                        mock_analysis.reasoning = "Complex query"
                        orchestrator.query_analyzer.analyze = AsyncMock(
                            return_value=mock_analysis
                        )

                        # Mock AgenticRAG with reflection
                        from app.models.chat import ReflectionResult

                        mock_reflection = ReflectionResult(
                            answered_query=True,
                            confidence_score=0.85,
                            citations_accurate=True,
                            needs_more_search=False,
                            suggested_followup_queries=[],
                            issues_found=[],
                            reasoning="Good response",
                        )

                        mock_metrics = MagicMock()
                        mock_metrics.query_time_ms = 100
                        mock_metrics.num_results = 5
                        mock_metrics.reranked = False
                        mock_metrics.top_score = 0.9
                        mock_metrics.average_score = 0.7

                        from app.models.chat import Citation

                        mock_citation = Citation(
                            source="doc.pdf",
                            relevance_score=0.9,
                            text_preview="Sample text",
                        )

                        orchestrator.agentic_rag.process_query_with_reflection = (
                            AsyncMock(
                                return_value=(
                                    "This is the response",
                                    [mock_citation],
                                    mock_metrics,
                                    mock_reflection,
                                )
                            )
                        )

                        return orchestrator

    @pytest.mark.asyncio
    async def test_process_with_reflection_yields_mode_chunk(
        self, reflection_orchestrator
    ):
        """Test process_with_reflection yields mode chunk."""
        with patch("app.rag.orchestrator.settings") as mock_settings:
            mock_settings.enable_reflection = True
            mock_settings.reflection_min_confidence = 0.6

            chunks = []
            async for chunk in reflection_orchestrator.process_with_reflection(
                "Complex query", mode=RAGMode.AGENTIC
            ):
                chunks.append(chunk)

        mode_chunks = [c for c in chunks if c.type == "mode"]
        assert len(mode_chunks) >= 1
        assert mode_chunks[0].mode == RAGMode.AGENTIC

    @pytest.mark.asyncio
    async def test_process_with_reflection_yields_reflection_chunk(
        self, reflection_orchestrator
    ):
        """Test process_with_reflection yields reflection result."""
        with patch("app.rag.orchestrator.settings") as mock_settings:
            mock_settings.enable_reflection = True
            mock_settings.reflection_min_confidence = 0.6

            chunks = []
            async for chunk in reflection_orchestrator.process_with_reflection(
                "Complex query", mode=RAGMode.AGENTIC
            ):
                chunks.append(chunk)

        reflection_chunks = [c for c in chunks if c.type == "reflection"]
        assert len(reflection_chunks) >= 1
        # Reflection is JSON serialized
        assert "confidence_score" in reflection_chunks[0].content

    @pytest.mark.asyncio
    async def test_process_with_reflection_yields_enhanced_metrics(
        self, reflection_orchestrator
    ):
        """Test process_with_reflection yields EnhancedRetrievalMetrics."""
        from app.models.chat import EnhancedRetrievalMetrics

        with patch("app.rag.orchestrator.settings") as mock_settings:
            mock_settings.enable_reflection = True
            mock_settings.reflection_min_confidence = 0.6

            chunks = []
            async for chunk in reflection_orchestrator.process_with_reflection(
                "Complex query", mode=RAGMode.AGENTIC
            ):
                chunks.append(chunk)

        done_chunks = [c for c in chunks if c.type == "done"]
        assert len(done_chunks) >= 1
        # Should have enhanced metrics with mode info
        assert done_chunks[0].metrics is not None
        assert hasattr(done_chunks[0].metrics, "mode_used")


class TestRAGOrchestratorSmartEscalation:
    """Tests for process_with_smart_escalation method."""

    @pytest.fixture
    def smart_escalation_orchestrator(self):
        """Create orchestrator for smart escalation tests."""
        with patch("app.rag.orchestrator.SimpleRAG"):
            with patch("app.rag.orchestrator.HybridRAG"):
                with patch("app.rag.orchestrator.AgenticRAG"):
                    with patch("app.rag.orchestrator.QueryAnalyzer"):
                        orchestrator = RAGOrchestrator()

                        # Mock analyzer with real QueryAnalysis object
                        from app.models.chat import QueryAnalysis, QueryType

                        mock_analysis = QueryAnalysis(
                            complexity_score=0.3,
                            query_type=QueryType.FACTUAL,
                            suggested_mode=RAGMode.SIMPLE,
                            keywords=["test"],
                            is_ambiguous=False,
                            needs_rewriting=False,
                            reasoning="Simple query",
                        )
                        orchestrator.query_analyzer.analyze = AsyncMock(
                            return_value=mock_analysis
                        )

                        # Mock SimpleRAG with low confidence results
                        async def low_conf_stream(*args, **kwargs):
                            yield StreamChunk(type="mode", mode=RAGMode.SIMPLE)
                            yield StreamChunk(type="token", content="Simple response")
                            # Low metrics = should trigger escalation
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=100,
                                    num_results=1,
                                    top_score=0.3,
                                    average_score=0.2,
                                    reranked=False,
                                ),
                            )

                        orchestrator.simple_rag.process_query_streaming = (
                            low_conf_stream
                        )

                        # Mock HybridRAG
                        async def hybrid_stream(*args, **kwargs):
                            yield StreamChunk(type="mode", mode=RAGMode.HYBRID)
                            yield StreamChunk(type="token", content="Hybrid response")
                            yield StreamChunk(
                                type="done",
                                metrics=RetrievalMetrics(
                                    query_time_ms=200,
                                    num_results=5,
                                    top_score=0.8,
                                    average_score=0.7,
                                    reranked=False,
                                ),
                            )

                        orchestrator.hybrid_rag.process_query_streaming = hybrid_stream

                        return orchestrator

    @pytest.mark.asyncio
    async def test_smart_escalation_yields_analysis(
        self, smart_escalation_orchestrator
    ):
        """Test smart escalation yields analysis chunk."""
        with patch("app.rag.orchestrator.settings") as mock_settings:
            mock_settings.reflection_min_confidence = 0.6

            chunks = []
            async for (
                chunk
            ) in smart_escalation_orchestrator.process_with_smart_escalation(
                "Test query"
            ):
                chunks.append(chunk)

        analysis_chunks = [c for c in chunks if c.type == "analysis"]
        assert len(analysis_chunks) >= 1

    @pytest.mark.asyncio
    async def test_smart_escalation_escalates_on_low_confidence(
        self, smart_escalation_orchestrator
    ):
        """Test smart escalation escalates when confidence is low."""
        with patch("app.rag.orchestrator.settings") as mock_settings:
            mock_settings.reflection_min_confidence = 0.6

            chunks = []
            async for (
                chunk
            ) in smart_escalation_orchestrator.process_with_smart_escalation(
                "Test query"
            ):
                chunks.append(chunk)

        mode_chunks = [c for c in chunks if c.type == "mode"]
        # Should have at least 2 mode chunks: initial + escalation
        assert len(mode_chunks) >= 2
        # First should be SIMPLE, second should be HYBRID
        assert mode_chunks[0].mode == RAGMode.SIMPLE
        assert mode_chunks[1].mode == RAGMode.HYBRID

    @pytest.mark.asyncio
    async def test_smart_escalation_tracks_escalation_in_metrics(
        self, smart_escalation_orchestrator
    ):
        """Test smart escalation tracks escalation path in metrics."""
        with patch("app.rag.orchestrator.settings") as mock_settings:
            mock_settings.reflection_min_confidence = 0.6

            chunks = []
            async for (
                chunk
            ) in smart_escalation_orchestrator.process_with_smart_escalation(
                "Test query"
            ):
                chunks.append(chunk)

        done_chunks = [c for c in chunks if c.type == "done"]
        assert len(done_chunks) >= 1

        final_metrics = done_chunks[-1].metrics
        assert final_metrics is not None
        # Should have escalation info
        assert final_metrics.escalated_from == RAGMode.SIMPLE
        assert "Confidence" in final_metrics.escalation_reason
