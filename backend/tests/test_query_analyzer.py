"""
Tests for QueryAnalyzer - intelligent RAG mode routing.
Tests query complexity scoring, type classification, and mode recommendation.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.rag.query_analyzer import QueryAnalyzer
from app.models.chat import QueryAnalysis, QueryType, RAGMode


class TestQueryAnalyzerComplexity:
    """Tests for complexity scoring (no external calls)."""

    def setup_method(self):
        """Set up QueryAnalyzer with mocked clients."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    self.analyzer = QueryAnalyzer()

    def test_simple_query_low_complexity(self):
        """Test simple factual query has low complexity."""
        result = self.analyzer._calculate_complexity("What is RAG?")
        assert result < 0.3

    def test_short_query_low_complexity(self):
        """Test short queries have low complexity."""
        result = self.analyzer._calculate_complexity("Hello")
        assert result < 0.2

    def test_long_query_higher_complexity(self):
        """Test longer queries have higher complexity."""
        long_query = "How do I implement a RAG system with hybrid search " \
                     "and what are the best practices for chunking documents " \
                     "and optimizing retrieval performance?"
        result = self.analyzer._calculate_complexity(long_query)
        assert result > 0.3

    def test_comparative_query_high_complexity(self):
        """Test comparative queries are scored as complex."""
        query = "What is the difference between RAG and fine-tuning?"
        result = self.analyzer._calculate_complexity(query)
        assert result >= 0.25  # Comparative term adds 0.25

    def test_multi_part_query_higher_complexity(self):
        """Test multi-part queries have higher complexity."""
        query = "What is RAG and how does it compare to fine-tuning?"
        result = self.analyzer._calculate_complexity(query)
        assert result >= 0.2  # Multi-part indicator adds 0.2

    def test_technical_query_higher_complexity(self):
        """Test technical terms increase complexity."""
        query = "Explain the architecture and implementation of vector embeddings"
        result = self.analyzer._calculate_complexity(query)
        assert result >= 0.2  # Technical terms add up to 0.2

    def test_analytical_query_high_complexity(self):
        """Test analytical terms increase complexity."""
        query = "Compare the advantages and disadvantages of semantic search"
        result = self.analyzer._calculate_complexity(query)
        assert result >= 0.4  # Analytical + comparative terms

    def test_multiple_questions_higher_complexity(self):
        """Test multiple question marks increase complexity."""
        query = "What is RAG? How does it work? Why should I use it?"
        result = self.analyzer._calculate_complexity(query)
        assert result >= 0.15  # Multiple questions add 0.15

    def test_complexity_capped_at_one(self):
        """Test complexity score never exceeds 1.0."""
        mega_query = "Compare and analyze the architecture, implementation, " \
                     "and performance optimization of hybrid search systems? " \
                     "What are the tradeoffs and advantages? And how does it work?"
        result = self.analyzer._calculate_complexity(mega_query)
        assert result <= 1.0


class TestQueryAnalyzerClassification:
    """Tests for query type classification."""

    def setup_method(self):
        """Set up QueryAnalyzer with mocked clients."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    self.analyzer = QueryAnalyzer()

    def test_factual_query_classification(self):
        """Test factual queries are classified correctly.
        Note: 'what is' triggers conceptual, so we use a simpler query."""
        result = self.analyzer._classify_query_type("When was the document uploaded?")
        assert result == QueryType.FACTUAL

    def test_conceptual_query_classification(self):
        """Test conceptual queries are classified correctly."""
        result = self.analyzer._classify_query_type("What is the meaning of embeddings?")
        assert result == QueryType.CONCEPTUAL

    def test_comparative_query_classification(self):
        """Test comparative queries are classified correctly.
        Note: Multi-part check (' and ?' pattern) is checked before comparative.
        Use a query without ' and ' to test comparative detection."""
        result = self.analyzer._classify_query_type("Compare RAG vs fine-tuning")
        assert result == QueryType.COMPARATIVE

    def test_procedural_query_classification(self):
        """Test procedural queries are classified correctly."""
        result = self.analyzer._classify_query_type("How do I upload a document?")
        assert result == QueryType.PROCEDURAL

    def test_how_to_query_is_procedural(self):
        """Test how-to queries are procedural."""
        result = self.analyzer._classify_query_type("How to set up vector search?")
        assert result == QueryType.PROCEDURAL

    def test_exploratory_query_classification(self):
        """Test exploratory queries are classified correctly."""
        result = self.analyzer._classify_query_type("Tell me about RAG systems")
        assert result == QueryType.EXPLORATORY

    def test_explain_query_is_exploratory(self):
        """Test explain queries are exploratory."""
        result = self.analyzer._classify_query_type("Explain how embeddings work")
        assert result == QueryType.EXPLORATORY

    def test_multi_part_query_classification(self):
        """Test multi-part queries are classified correctly."""
        result = self.analyzer._classify_query_type("What is RAG? And how does it work?")
        assert result == QueryType.MULTI_PART

    def test_versus_query_is_comparative(self):
        """Test 'vs' queries are comparative."""
        result = self.analyzer._classify_query_type("RAG vs fine-tuning")
        assert result == QueryType.COMPARATIVE


class TestQueryAnalyzerAmbiguity:
    """Tests for ambiguity detection."""

    def setup_method(self):
        """Set up QueryAnalyzer with mocked clients."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    self.analyzer = QueryAnalyzer()

    def test_pronoun_at_start_is_ambiguous(self):
        """Test queries starting with pronouns are ambiguous."""
        result = self.analyzer._detect_ambiguity("It seems broken")
        assert result is True

    def test_very_short_query_is_ambiguous(self):
        """Test very short queries are ambiguous."""
        result = self.analyzer._detect_ambiguity("Why?")
        assert result is True

    def test_many_pronouns_is_ambiguous(self):
        """Test queries with many pronouns are ambiguous."""
        result = self.analyzer._detect_ambiguity("They said it was like that thing")
        assert result is True

    def test_context_dependent_is_ambiguous(self):
        """Test context-dependent phrases are ambiguous."""
        result = self.analyzer._detect_ambiguity("As discussed earlier, what do you think?")
        assert result is True

    def test_clear_query_not_ambiguous(self):
        """Test clear queries are not ambiguous."""
        result = self.analyzer._detect_ambiguity("What is retrieval augmented generation?")
        assert result is False

    def test_specific_query_not_ambiguous(self):
        """Test specific queries are not ambiguous."""
        result = self.analyzer._detect_ambiguity("How does Pinecone store vectors?")
        assert result is False


class TestQueryAnalyzerKeywords:
    """Tests for keyword extraction."""

    def setup_method(self):
        """Set up QueryAnalyzer with mocked clients."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    self.analyzer = QueryAnalyzer()

    def test_extracts_keywords(self):
        """Test keywords are extracted from query."""
        result = self.analyzer._extract_keywords("What is retrieval augmented generation?")
        assert "retrieval" in result
        assert "augmented" in result
        assert "generation" in result

    def test_removes_stop_words(self):
        """Test stop words are removed."""
        result = self.analyzer._extract_keywords("What is the best way to do this?")
        assert "the" not in result
        assert "is" not in result
        assert "to" not in result

    def test_removes_duplicates(self):
        """Test duplicate keywords are removed."""
        result = self.analyzer._extract_keywords("RAG RAG RAG is about RAG")
        assert result.count("rag") == 1

    def test_limits_keywords(self):
        """Test keywords are limited to 10."""
        long_query = " ".join([f"keyword{i}" for i in range(20)])
        result = self.analyzer._extract_keywords(long_query)
        assert len(result) <= 10


class TestQueryAnalyzerModeRecommendation:
    """Tests for RAG mode recommendation."""

    def setup_method(self):
        """Set up QueryAnalyzer with mocked clients."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.complexity_threshold_low = 0.3
            mock_settings.complexity_threshold_high = 0.7
            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    self.analyzer = QueryAnalyzer()

    def test_ambiguous_query_recommends_agentic(self):
        """Test ambiguous queries route to agentic mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.2,
            query_type=QueryType.FACTUAL,
            is_ambiguous=True
        )
        assert result == RAGMode.AGENTIC

    def test_multi_part_recommends_agentic(self):
        """Test multi-part queries route to agentic mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.3,
            query_type=QueryType.MULTI_PART,
            is_ambiguous=False
        )
        assert result == RAGMode.AGENTIC

    def test_exploratory_recommends_agentic(self):
        """Test exploratory queries route to agentic mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.3,
            query_type=QueryType.EXPLORATORY,
            is_ambiguous=False
        )
        assert result == RAGMode.AGENTIC

    def test_comparative_recommends_hybrid(self):
        """Test comparative queries route to hybrid mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.4,
            query_type=QueryType.COMPARATIVE,
            is_ambiguous=False
        )
        assert result == RAGMode.HYBRID

    def test_procedural_recommends_hybrid(self):
        """Test procedural queries route to hybrid mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.4,
            query_type=QueryType.PROCEDURAL,
            is_ambiguous=False
        )
        assert result == RAGMode.HYBRID

    def test_low_complexity_recommends_simple(self):
        """Test low complexity factual queries route to simple mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.1,
            query_type=QueryType.FACTUAL,
            is_ambiguous=False
        )
        assert result == RAGMode.SIMPLE

    def test_medium_complexity_recommends_hybrid(self):
        """Test medium complexity queries route to hybrid mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.5,
            query_type=QueryType.FACTUAL,
            is_ambiguous=False
        )
        assert result == RAGMode.HYBRID

    def test_high_complexity_recommends_agentic(self):
        """Test high complexity queries route to agentic mode."""
        result = self.analyzer._recommend_mode(
            complexity=0.8,
            query_type=QueryType.FACTUAL,
            is_ambiguous=False
        )
        assert result == RAGMode.AGENTIC


class TestQueryAnalyzerAnalyze:
    """Tests for the full analyze method."""

    @pytest.mark.asyncio
    async def test_analyze_returns_query_analysis(self):
        """Test analyze returns QueryAnalysis object."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.complexity_threshold_low = 0.3
            mock_settings.complexity_threshold_high = 0.7

            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    result = await analyzer.analyze("What is RAG?")

        assert isinstance(result, QueryAnalysis)
        assert 0 <= result.complexity_score <= 1
        assert result.query_type in QueryType
        assert result.suggested_mode in RAGMode
        assert isinstance(result.keywords, list)
        assert isinstance(result.is_ambiguous, bool)
        assert isinstance(result.needs_rewriting, bool)
        assert result.reasoning is not None

    @pytest.mark.asyncio
    async def test_analyze_simple_query(self):
        """Test analysis of simple query.
        Note: 'What is' triggers CONCEPTUAL type, but low complexity still routes to SIMPLE mode."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.complexity_threshold_low = 0.3
            mock_settings.complexity_threshold_high = 0.7

            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    result = await analyzer.analyze("What is RAG?")

        assert result.suggested_mode == RAGMode.SIMPLE
        assert result.query_type == QueryType.CONCEPTUAL  # 'What is' triggers conceptual
        assert result.is_ambiguous is False

    @pytest.mark.asyncio
    async def test_analyze_complex_query(self):
        """Test analysis of complex comparative query."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.complexity_threshold_low = 0.3
            mock_settings.complexity_threshold_high = 0.7

            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    result = await analyzer.analyze(
                        "Compare the advantages and disadvantages of RAG vs fine-tuning "
                        "for enterprise applications"
                    )

        # Should route to hybrid or agentic due to comparative nature
        assert result.suggested_mode in [RAGMode.HYBRID, RAGMode.AGENTIC]
        assert result.complexity_score > 0.3


class TestQueryAnalyzerHyDE:
    """Tests for HyDE (Hypothetical Document Embeddings) generation."""

    @pytest.mark.asyncio
    async def test_generate_hyde_document_returns_string(self):
        """Test HyDE generation returns a string."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_model = "claude-3-haiku-20240307"

            mock_anthropic = MagicMock()
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text="This is a hypothetical answer about RAG.")]
            mock_anthropic.messages.create = AsyncMock(return_value=mock_response)

            with patch('app.rag.query_analyzer.AsyncAnthropic', return_value=mock_anthropic):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    result = await analyzer.generate_hyde_document("What is RAG?")

        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_generate_hyde_document_fallback_on_error(self):
        """Test HyDE falls back to original query on error."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_model = "claude-3-haiku-20240307"

            mock_anthropic = MagicMock()
            mock_anthropic.messages.create = AsyncMock(side_effect=Exception("API Error"))

            with patch('app.rag.query_analyzer.AsyncAnthropic', return_value=mock_anthropic):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    result = await analyzer.generate_hyde_document("What is RAG?")

        # Should fall back to original query
        assert result == "What is RAG?"

    @pytest.mark.asyncio
    async def test_embed_hyde_document_returns_vector(self):
        """Test HyDE embedding returns a vector."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_model = "claude-3-haiku-20240307"
            mock_settings.embedding_model = "text-embedding-3-small"

            mock_anthropic = MagicMock()
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text="Hypothetical answer.")]
            mock_anthropic.messages.create = AsyncMock(return_value=mock_response)

            mock_openai = MagicMock()
            mock_embed_response = MagicMock()
            mock_embed_response.data = [MagicMock(embedding=[0.1] * 512)]
            mock_openai.embeddings.create = AsyncMock(return_value=mock_embed_response)

            with patch('app.rag.query_analyzer.AsyncAnthropic', return_value=mock_anthropic):
                with patch('app.rag.query_analyzer.AsyncOpenAI', return_value=mock_openai):
                    analyzer = QueryAnalyzer()
                    result = await analyzer.embed_hyde_document("What is RAG?")

        assert isinstance(result, list)
        assert len(result) == 512


class TestQueryAnalyzerGapDetection:
    """Tests for information gap detection."""

    @pytest.mark.asyncio
    async def test_detect_gaps_with_no_contexts(self):
        """Test gap detection with empty contexts."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"

            with patch('app.rag.query_analyzer.AsyncAnthropic'):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    has_gaps, queries = await analyzer.detect_information_gaps(
                        "What is RAG?", []
                    )

        assert has_gaps is True
        assert queries == ["What is RAG?"]

    @pytest.mark.asyncio
    async def test_detect_gaps_with_complete_context(self):
        """Test gap detection with complete context."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_model = "claude-3-haiku-20240307"

            mock_anthropic = MagicMock()
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text='{"is_complete": true, "missing_aspects": [], "supplementary_queries": []}')]
            mock_anthropic.messages.create = AsyncMock(return_value=mock_response)

            with patch('app.rag.query_analyzer.AsyncAnthropic', return_value=mock_anthropic):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    contexts = [{"text": "RAG is Retrieval Augmented Generation..."}]
                    has_gaps, queries = await analyzer.detect_information_gaps(
                        "What is RAG?", contexts
                    )

        assert has_gaps is False
        assert queries == []

    @pytest.mark.asyncio
    async def test_detect_gaps_returns_supplementary_queries(self):
        """Test gap detection returns supplementary queries when needed."""
        with patch('app.rag.query_analyzer.settings') as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.openai_api_key = "test-key"
            mock_settings.anthropic_model = "claude-3-haiku-20240307"

            mock_anthropic = MagicMock()
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text='''{
                "is_complete": false,
                "missing_aspects": ["implementation details"],
                "supplementary_queries": ["How to implement RAG?"]
            }''')]
            mock_anthropic.messages.create = AsyncMock(return_value=mock_response)

            with patch('app.rag.query_analyzer.AsyncAnthropic', return_value=mock_anthropic):
                with patch('app.rag.query_analyzer.AsyncOpenAI'):
                    analyzer = QueryAnalyzer()
                    contexts = [{"text": "RAG stands for..."}]
                    has_gaps, queries = await analyzer.detect_information_gaps(
                        "What is RAG and how to implement it?", contexts
                    )

        assert has_gaps is True
        assert "How to implement RAG?" in queries
