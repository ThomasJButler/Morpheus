"""
Query rewriting and enhancement for improved retrieval.

Provides various query transformation strategies:
- Query expansion with synonyms
- Query decomposition into sub-queries
- Query clarification for ambiguous terms
- Contextual rewriting based on conversation history
"""

import logging
from typing import List, Optional

from anthropic import AsyncAnthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


class QueryRewriter:
    """
    Handles query rewriting and enhancement for improved retrieval.

    Uses LLM-based rewriting to transform user queries into more
    effective search queries whilst preserving intent.
    """

    def __init__(self):
        self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        logger.info("QueryRewriter initialised")

    async def rewrite_for_retrieval(
        self,
        query: str,
        conversation_history: Optional[List[str]] = None,
    ) -> str:
        """
        Rewrite query to improve retrieval effectiveness.

        Args:
            query: Original user query
            conversation_history: Optional conversation context

        Returns:
            Rewritten query optimised for search
        """
        try:
            # Build context from conversation history if available
            context = ""
            if conversation_history:
                context = "Previous conversation:\n" + "\n".join(
                    conversation_history[-3:]  # Last 3 turns
                )

            # System prompt for query rewriting
            system_prompt = """You are a search query optimisation expert.

Your task is to rewrite user queries to improve retrieval from a knowledge base.

Guidelines:
1. Make queries more specific and searchable
2. Expand abbreviations and acronyms
3. Add relevant technical terms
4. Remove conversational filler
5. Preserve the core intent
6. Use domain-appropriate vocabulary

Examples:
- "How does it work?" → "How does [specific system from context] work?"
- "Tell me about RAG" → "Retrieval-Augmented Generation architecture and implementation"
- "What's the difference?" → "Difference between [A] and [B]"

Return ONLY the rewritten query, nothing else."""

            user_prompt = f"""{context}

Original query: {query}

Rewrite this query to be more specific and effective for knowledge base search:"""

            # Request rewrite from Claude
            response = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            rewritten = response.content[0].text.strip()

            logger.info(f"Query rewritten: '{query}' → '{rewritten}'")
            return rewritten

        except Exception as e:
            logger.error(f"Query rewriting failed: {e}")
            # Fall back to original query on error
            return query

    async def expand_query(
        self,
        query: str,
        num_expansions: int = 3,
    ) -> List[str]:
        """
        Generate multiple expanded versions of a query.

        Creates alternative phrasings and related queries
        for comprehensive retrieval.

        Args:
            query: Original query
            num_expansions: Number of expanded queries to generate

        Returns:
            List of expanded query variations
        """
        try:
            system_prompt = """You are a search query expansion expert.

Generate alternative phrasings and related queries that capture the same information need.

Guidelines:
1. Use synonyms and related terms
2. Rephrase with different structures
3. Include both broad and specific versions
4. Maintain semantic equivalence
5. Think of how information might be phrased in documents

Return queries as a JSON array of strings."""

            user_prompt = f"""Original query: {query}

Generate {num_expansions} alternative queries:"""

            response = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=300,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # Parse expanded queries (simple text splitting)
            text = response.content[0].text.strip()
            lines = [line.strip() for line in text.split("\n") if line.strip()]

            # Clean up formatting
            expanded = []
            for line in lines:
                # Remove numbering, bullets, quotes
                clean = line.lstrip("0123456789.-*•\"'[] ")
                clean = clean.rstrip("\"'")
                if clean and clean != query:
                    expanded.append(clean)

            # Limit to requested number
            expanded = expanded[:num_expansions]

            # Always include original query
            if query not in expanded:
                expanded.insert(0, query)

            logger.info(f"Generated {len(expanded)} query expansions")
            return expanded

        except Exception as e:
            logger.error(f"Query expansion failed: {e}")
            return [query]

    async def decompose_query(
        self,
        query: str,
    ) -> List[str]:
        """
        Decompose complex query into simpler sub-queries.

        Breaks down multi-part questions into atomic queries
        that can be answered independently.

        Args:
            query: Complex query to decompose

        Returns:
            List of simpler sub-queries
        """
        try:
            system_prompt = """You are a query decomposition expert.

Break down complex queries into simpler, atomic sub-queries that can be answered independently.

Guidelines:
1. Each sub-query should be self-contained
2. Sub-queries should be answerable separately
3. Together, sub-queries should cover the original question
4. Use clear, specific language
5. Preserve technical terms

Examples:
"How do I set up RAG and what are the costs?" →
- "How to set up a RAG system"
- "What are the costs of running a RAG system"

Return sub-queries as a numbered list."""

            user_prompt = f"""Complex query: {query}

Decompose into simpler sub-queries:"""

            response = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=400,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # Parse sub-queries
            text = response.content[0].text.strip()
            lines = [line.strip() for line in text.split("\n") if line.strip()]

            sub_queries = []
            for line in lines:
                # Remove numbering and formatting
                clean = line.lstrip("0123456789.-*•\"'[] ")
                clean = clean.rstrip("\"'?")
                if clean:
                    sub_queries.append(clean)

            if not sub_queries:
                sub_queries = [query]

            logger.info(f"Decomposed query into {len(sub_queries)} sub-queries")
            return sub_queries

        except Exception as e:
            logger.error(f"Query decomposition failed: {e}")
            return [query]

    async def clarify_ambiguity(
        self,
        query: str,
        context: Optional[str] = None,
    ) -> str:
        """
        Clarify ambiguous queries using available context.

        Args:
            query: Potentially ambiguous query
            context: Optional context for disambiguation

        Returns:
            Clarified query
        """
        try:
            system_prompt = """You are a query clarification expert.

Identify and resolve ambiguities in queries using available context.

Guidelines:
1. Detect pronouns and vague references
2. Resolve them using context
3. Make implicit information explicit
4. Expand abbreviations
5. Preserve original intent

If no ambiguity exists, return the original query unchanged."""

            context_str = f"\n\nAvailable context:\n{context}" if context else ""

            user_prompt = f"""Query: {query}{context_str}

Clarify any ambiguities:"""

            response = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            clarified = response.content[0].text.strip()

            if clarified != query:
                logger.info(f"Query clarified: '{query}' → '{clarified}'")

            return clarified

        except Exception as e:
            logger.error(f"Query clarification failed: {e}")
            return query


# Convenience functions
async def rewrite_query(
    query: str,
    conversation_history: Optional[List[str]] = None,
) -> str:
    """
    Quick query rewriting function.

    Args:
        query: Query to rewrite
        conversation_history: Optional conversation context

    Returns:
        Rewritten query
    """
    rewriter = QueryRewriter()
    return await rewriter.rewrite_for_retrieval(query, conversation_history)


async def expand_query(query: str, num_expansions: int = 3) -> List[str]:
    """
    Quick query expansion function.

    Args:
        query: Query to expand
        num_expansions: Number of variations to generate

    Returns:
        List of expanded queries
    """
    rewriter = QueryRewriter()
    return await rewriter.expand_query(query, num_expansions)
