"""
Query Analyzer for intelligent RAG mode routing.

Analyzes query complexity and characteristics to determine
the optimal RAG mode (Simple, Hybrid, or Agentic).

Features:
- Complexity scoring (0-1)
- Query type classification
- HyDE (Hypothetical Document Embeddings) generation
- Gap detection for iterative refinement
"""

import logging
import re
from typing import List, Optional, Tuple

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.chat import QueryAnalysis, QueryType, RAGMode

logger = logging.getLogger(__name__)


class QueryAnalyzer:
    """
    Analyze query complexity and recommend RAG mode with 2025 techniques.

    Routing logic:
    - complexity < 0.3 → SimpleRAG (fast, cheap)
    - 0.3 <= complexity < 0.7 → HybridRAG (balanced)
    - complexity >= 0.7 OR ambiguous → AgenticRAG (best accuracy)
    """

    def __init__(self):
        self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        logger.info("QueryAnalyzer initialized")

    async def analyze(self, query: str) -> QueryAnalysis:
        """
        Analyze query and return recommendation.

        Args:
            query: User's query text

        Returns:
            QueryAnalysis with complexity score, type, and recommended mode
        """
        # Extract features for analysis
        complexity = self._calculate_complexity(query)
        query_type = self._classify_query_type(query)
        is_ambiguous = self._detect_ambiguity(query)
        keywords = self._extract_keywords(query)
        needs_rewriting = is_ambiguous or len(keywords) < 2

        # Determine suggested mode
        suggested_mode = self._recommend_mode(complexity, query_type, is_ambiguous)

        # Generate reasoning
        reasoning = self._generate_reasoning(
            complexity, query_type, is_ambiguous, suggested_mode
        )

        return QueryAnalysis(
            complexity_score=complexity,
            query_type=query_type,
            suggested_mode=suggested_mode,
            keywords=keywords,
            is_ambiguous=is_ambiguous,
            needs_rewriting=needs_rewriting,
            reasoning=reasoning,
        )

    def _calculate_complexity(self, query: str) -> float:
        """
        Calculate complexity score (0-1) based on multiple factors.

        Factors:
        - Query length
        - Number of clauses/questions
        - Technical vocabulary
        - Comparative/analytical terms
        """
        score = 0.0
        words = query.lower().split()
        word_count = len(words)

        # Length factor (longer queries tend to be more complex)
        if word_count > 20:
            score += 0.2
        elif word_count > 10:
            score += 0.1

        # Multi-part detection
        multi_part_indicators = ["and", "also", "additionally", "furthermore", "plus"]
        if any(word in words for word in multi_part_indicators):
            score += 0.2

        # Question words that indicate complexity
        complex_starters = ["how", "why", "compare", "difference", "explain", "analyze"]
        simple_starters = ["what", "who", "when", "where"]

        first_word = words[0] if words else ""
        if first_word in complex_starters:
            score += 0.15
        elif first_word in simple_starters:
            score += 0.05

        # Comparative/analytical terms
        analytical_terms = [
            "vs",
            "versus",
            "compare",
            "contrast",
            "difference",
            "similarities",
            "advantages",
            "disadvantages",
            "pros",
            "cons",
            "better",
            "worse",
            "best",
            "optimal",
            "tradeoffs",
            "trade-offs",
        ]
        if any(term in query.lower() for term in analytical_terms):
            score += 0.25

        # Technical depth indicators
        technical_terms = [
            "architecture",
            "implementation",
            "configuration",
            "integration",
            "performance",
            "optimization",
            "algorithm",
            "pattern",
            "design",
        ]
        technical_count = sum(1 for term in technical_terms if term in query.lower())
        score += min(technical_count * 0.1, 0.2)

        # Multiple question marks
        if query.count("?") > 1:
            score += 0.15

        return min(score, 1.0)  # Cap at 1.0

    def _classify_query_type(self, query: str) -> QueryType:
        """
        Classify query into a type category.
        """
        query_lower = query.lower()

        # Check for multi-part queries first
        if query.count("?") > 1 or " and " in query_lower and "?" in query:
            return QueryType.MULTI_PART

        # Comparative queries
        comparative_terms = ["vs", "versus", "compare", "difference", "between"]
        if any(term in query_lower for term in comparative_terms):
            return QueryType.COMPARATIVE

        # Procedural queries (how-to)
        if query_lower.startswith(
            ("how do", "how to", "how can", "steps to", "process for")
        ):
            return QueryType.PROCEDURAL

        # Exploratory queries
        exploratory_starters = [
            "what are the best",
            "what are some",
            "tell me about",
            "explain",
            "describe",
            "overview",
            "introduction",
        ]
        if any(query_lower.startswith(starter) for starter in exploratory_starters):
            return QueryType.EXPLORATORY

        # Conceptual queries (understanding)
        conceptual_terms = ["what is", "what are", "define", "meaning of", "concept of"]
        if any(term in query_lower for term in conceptual_terms):
            return QueryType.CONCEPTUAL

        # Default to factual for simple lookup queries
        return QueryType.FACTUAL

    def _detect_ambiguity(self, query: str) -> bool:
        """
        Detect if query contains ambiguous references.
        """
        # Pronouns without clear antecedents
        ambiguous_pronouns = ["it", "this", "that", "they", "them", "these", "those"]
        words = query.lower().split()

        # Check if query starts with or heavily uses pronouns
        if words and words[0] in ambiguous_pronouns:
            return True

        pronoun_count = sum(1 for word in words if word in ambiguous_pronouns)
        if pronoun_count > 2:
            return True

        # Very short queries are often ambiguous
        if len(words) < 3:
            return True

        # Questions that need context
        context_dependent = ["the previous", "mentioned earlier", "as discussed"]
        if any(phrase in query.lower() for phrase in context_dependent):
            return True

        return False

    def _extract_keywords(self, query: str) -> List[str]:
        """
        Extract key terms from query for search.
        """
        # Remove common stop words
        stop_words = {
            "a",
            "an",
            "the",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "shall",
            "can",
            "need",
            "dare",
            "ought",
            "used",
            "to",
            "of",
            "in",
            "for",
            "on",
            "with",
            "at",
            "by",
            "from",
            "up",
            "about",
            "into",
            "over",
            "after",
            "i",
            "me",
            "my",
            "myself",
            "we",
            "our",
            "ours",
            "you",
            "your",
            "he",
            "him",
            "his",
            "she",
            "her",
            "it",
            "its",
            "they",
            "them",
            "their",
            "what",
            "which",
            "who",
            "whom",
            "this",
            "that",
            "these",
            "those",
            "am",
            "and",
            "but",
            "if",
            "or",
            "because",
            "as",
            "until",
            "while",
            "how",
            "why",
            "when",
            "where",
            "all",
            "each",
            "every",
            "both",
            "few",
            "more",
            "most",
            "other",
            "some",
            "such",
            "no",
            "nor",
            "not",
            "only",
            "own",
            "same",
            "so",
            "than",
            "too",
            "very",
            "just",
            "also",
        }

        # Tokenize and filter
        words = re.findall(r"\b[a-zA-Z]+\b", query.lower())
        keywords = [w for w in words if w not in stop_words and len(w) > 2]

        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)

        return unique_keywords[:10]  # Limit to top 10

    def _recommend_mode(
        self, complexity: float, query_type: QueryType, is_ambiguous: bool
    ) -> RAGMode:
        """
        Recommend RAG mode based on analysis.
        """
        # Ambiguous queries benefit from agentic reasoning
        if is_ambiguous:
            return RAGMode.AGENTIC

        # Query type-specific routing
        if query_type == QueryType.MULTI_PART:
            return RAGMode.AGENTIC
        elif query_type == QueryType.EXPLORATORY:
            return RAGMode.AGENTIC
        elif query_type == QueryType.COMPARATIVE:
            return RAGMode.HYBRID  # Hybrid good for finding multiple perspectives
        elif query_type == QueryType.PROCEDURAL:
            return RAGMode.HYBRID  # Step-by-step benefits from keyword + semantic

        # Complexity-based routing
        if complexity >= settings.complexity_threshold_high:
            return RAGMode.AGENTIC
        elif complexity >= settings.complexity_threshold_low:
            return RAGMode.HYBRID
        else:
            return RAGMode.SIMPLE

    def _generate_reasoning(
        self,
        complexity: float,
        query_type: QueryType,
        is_ambiguous: bool,
        suggested_mode: RAGMode,
    ) -> str:
        """
        Generate human-readable reasoning for mode selection.
        """
        reasons = []

        if is_ambiguous:
            reasons.append("Query contains ambiguous references")

        if query_type == QueryType.MULTI_PART:
            reasons.append("Multiple questions detected")
        elif query_type == QueryType.EXPLORATORY:
            reasons.append("Open-ended exploration query")
        elif query_type == QueryType.COMPARATIVE:
            reasons.append("Comparative analysis required")
        elif query_type == QueryType.PROCEDURAL:
            reasons.append("Step-by-step information needed")

        if complexity >= 0.7:
            reasons.append(f"High complexity ({complexity:.2f})")
        elif complexity >= 0.3:
            reasons.append(f"Moderate complexity ({complexity:.2f})")
        else:
            reasons.append(f"Low complexity ({complexity:.2f})")

        mode_desc = {
            RAGMode.SIMPLE: "SimpleRAG (fast semantic search)",
            RAGMode.HYBRID: "HybridRAG (semantic + keyword)",
            RAGMode.AGENTIC: "AgenticRAG (intelligent agent)",
        }

        return f"{mode_desc.get(suggested_mode, str(suggested_mode))}: {', '.join(reasons)}"

    async def generate_hyde_document(self, query: str) -> str:
        """
        HyDE: Generate hypothetical answer document for better embedding.

        Instead of embedding the query directly, we:
        1. Ask LLM to generate a hypothetical answer
        2. Embed that hypothetical document
        3. Search for similar REAL documents

        This bridges the query-document gap brilliantly.

        Args:
            query: User's query

        Returns:
            Hypothetical document text
        """
        try:
            system_prompt = """You are a document generator. Given a question, write a short passage that would directly answer it, as if it were from an authoritative document.

Write in a factual, informative style. The passage should be 2-4 sentences that directly address the question.

Do NOT include phrases like "According to..." or "The answer is...". Just write the content directly."""

            response = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": f"Question: {query}"}],
            )

            hyde_doc = response.content[0].text.strip()
            logger.info(f"Generated HyDE document: '{hyde_doc[:50]}...'")
            return hyde_doc

        except Exception as e:
            logger.error(f"HyDE generation failed: {e}")
            # Fall back to original query
            return query

    async def embed_hyde_document(self, query: str) -> List[float]:
        """
        Generate embedding for HyDE document.

        Args:
            query: Original query (used to generate HyDE doc)

        Returns:
            Embedding vector for the hypothetical document
        """
        # Generate hypothetical document
        hyde_doc = await self.generate_hyde_document(query)

        # Embed the HyDE document instead of the query
        try:
            dimensions = 512 if "small" in settings.embedding_model else None
            embedding_params = {"model": settings.embedding_model, "input": hyde_doc}
            if dimensions:
                embedding_params["dimensions"] = dimensions

            response = await self.openai_client.embeddings.create(**embedding_params)
            return response.data[0].embedding

        except Exception as e:
            logger.error(f"HyDE embedding failed: {e}")
            raise

    async def detect_information_gaps(
        self,
        query: str,
        retrieved_contexts: List[dict],
    ) -> Tuple[bool, List[str]]:
        """
        Gap Detection: Identify missing information.

        Returns list of supplementary queries if gaps detected.
        Enables the "iterative refinement" pattern from 2025 research.

        Args:
            query: Original user query
            retrieved_contexts: Retrieved context chunks

        Returns:
            Tuple of (has_gaps, supplementary_queries)
        """
        if not retrieved_contexts:
            # No contexts = definite gap
            return True, [query]

        try:
            # Format contexts for analysis
            context_texts = [
                ctx.get("text", "")[:300] for ctx in retrieved_contexts[:5]
            ]
            context_summary = "\n---\n".join(context_texts)

            system_prompt = """You are an information completeness analyzer.

Given a question and retrieved context, determine:
1. Does the context fully answer the question?
2. What specific information is missing?

If information is missing, suggest 1-3 focused search queries to fill the gaps.

Respond in JSON format:
{
    "is_complete": true/false,
    "missing_aspects": ["aspect1", "aspect2"],
    "supplementary_queries": ["query1", "query2"]
}"""

            response = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=300,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": f"Question: {query}\n\nRetrieved Context:\n{context_summary}",
                    }
                ],
            )

            # Parse response
            import json

            result_text = response.content[0].text.strip()
            # Try to extract JSON from response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If not valid JSON, try to find JSON in text
                import re

                json_match = re.search(r"\{[^}]+\}", result_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    # Fallback: assume complete
                    return False, []

            has_gaps = not result.get("is_complete", True)
            supplementary = result.get("supplementary_queries", [])

            if has_gaps:
                logger.info(
                    f"Detected information gaps: {result.get('missing_aspects', [])}"
                )

            return has_gaps, supplementary

        except Exception as e:
            logger.error(f"Gap detection failed: {e}")
            return False, []
