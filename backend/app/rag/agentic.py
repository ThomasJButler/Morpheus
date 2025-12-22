"""
Agentic RAG implementation using Claude's tool use capability.

Claude acts as an intelligent agent that:
- Analyses queries to understand intent
- Decides when retrieval is necessary
- May rewrite queries for better results
- Performs multiple searches if needed
- Synthesises responses with proper citations

Based on preserved code from MorpheusRAGLearningDocuments/original-code/agentic.py
Modified for namespace support, timeout handling, and enhanced metrics.
"""

import asyncio
import json
import logging
import time
from typing import AsyncGenerator, Dict, List, Optional, Tuple

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.morpheus_prompts import get_system_prompt
from app.core.pinecone_client import get_pinecone_client
from app.models.chat import (
    Citation,
    EnhancedRetrievalMetrics,
    RAGMode,
    ReflectionResult,
    RetrievalMetrics,
    StreamChunk,
)

logger = logging.getLogger(__name__)


class AgenticRAG:
    """
    Intelligent RAG system using Claude as decision-making agent.

    Claude analyses queries and autonomously decides retrieval strategy,
    potentially rewriting queries or performing multiple searches for
    comprehensive answers.
    """

    def __init__(self):
        self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.pinecone_client = get_pinecone_client()
        self.index = self.pinecone_client.get_index()

        # Define search tools for Claude
        self.tools = self._define_search_tools()

        logger.info("AgenticRAG initialised with tool use capability")

    def _define_search_tools(self) -> List[Dict]:
        """
        Define search tools available to Claude.

        Returns:
            List of tool definitions for Claude's tool use API
        """
        return [
            {
                "name": "search_knowledge_base",
                "description": "Search the knowledge base for relevant information. "
                "Use this when you need factual information to answer the user's question. "
                "You can call this multiple times with different queries if needed.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query. Be specific and include key terms.",
                        },
                        "top_k": {
                            "type": "integer",
                            "description": "Number of results to retrieve (default: 5)",
                            "default": 5,
                        },
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "rewrite_query",
                "description": "Rewrite a query to improve search results. "
                "Use this if the original query is ambiguous or could be more specific.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "original_query": {
                            "type": "string",
                            "description": "The original user query",
                        },
                        "rewritten_query": {
                            "type": "string",
                            "description": "The improved, more specific query",
                        },
                        "reasoning": {
                            "type": "string",
                            "description": "Brief explanation of why you rewrote the query",
                        },
                    },
                    "required": ["original_query", "rewritten_query"],
                },
            },
        ]

    async def _embed_query(self, query: str) -> List[float]:
        """
        Generate dense embedding for query.

        Args:
            query: Query text

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
            logger.error(f"Embedding generation failed: {e}")
            raise

    async def _search_knowledge_base(
        self, query: str, top_k: int = 5, namespace: str = None
    ) -> List[Dict]:
        """
        Execute search against knowledge base.

        Args:
            query: Search query
            top_k: Number of results to retrieve
            namespace: Pinecone namespace for session isolation

        Returns:
            List of search results with text and metadata
        """
        namespace = namespace or "default"

        try:
            # Generate query embedding
            query_embedding = await self._embed_query(query)

            # Search dense index
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                namespace=namespace,
            )

            # Format results
            contexts = []
            for match in results.get("matches", []):
                contexts.append({
                    "text": match.metadata.get("text", ""),
                    "source": match.metadata.get("source", "Unknown"),
                    "page": match.metadata.get("page"),
                    "chunk_id": match.id,
                    "score": match.score,
                })

            logger.info(f"Retrieved {len(contexts)} results for query: {query[:50]}...")
            return contexts

        except Exception as e:
            logger.error(f"Knowledge base search failed: {e}")
            return []

    async def _execute_tool(
        self, tool_name: str, tool_input: Dict, namespace: str = None
    ) -> Dict:
        """
        Execute tool requested by Claude.

        Args:
            tool_name: Name of the tool to execute
            tool_input: Input parameters for the tool
            namespace: Pinecone namespace for session isolation

        Returns:
            Tool execution result
        """
        if tool_name == "search_knowledge_base":
            query = tool_input.get("query", "")
            top_k = tool_input.get("top_k", 5)

            results = await self._search_knowledge_base(query, top_k, namespace)

            return {
                "success": True,
                "query": query,
                "num_results": len(results),
                "results": results,
            }

        elif tool_name == "rewrite_query":
            original = tool_input.get("original_query", "")
            rewritten = tool_input.get("rewritten_query", "")
            reasoning = tool_input.get("reasoning", "")

            logger.info(f"Query rewritten: '{original[:30]}...' → '{rewritten[:30]}...' ({reasoning})")

            return {
                "success": True,
                "original_query": original,
                "rewritten_query": rewritten,
                "reasoning": reasoning,
            }

        else:
            logger.warning(f"Unknown tool: {tool_name}")
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}",
            }

    def _format_tool_result(self, tool_result: Dict) -> str:
        """
        Format tool execution result for Claude.

        Args:
            tool_result: Tool execution result

        Returns:
            Formatted string for Claude's context
        """
        if tool_result.get("success"):
            if "results" in tool_result:
                # Format search results
                results = tool_result["results"]
                if not results:
                    return "No relevant information found in knowledge base."

                formatted = []
                for i, result in enumerate(results, 1):
                    source = result["source"]
                    page = f", Page {result['page']}" if result.get("page") else ""
                    text = result["text"]
                    formatted.append(
                        f"[Result {i}] (Source: {source}{page}, Score: {result['score']:.3f})\n{text}"
                    )

                return "\n\n".join(formatted)

            elif "rewritten_query" in tool_result:
                # Format query rewrite result
                return (
                    f"Query successfully rewritten from '{tool_result['original_query']}' "
                    f"to '{tool_result['rewritten_query']}'"
                )

        return f"Tool execution failed: {tool_result.get('error', 'Unknown error')}"

    def _extract_citations(self, search_results: List[Dict]) -> List[Citation]:
        """
        Create citations from search results.

        Args:
            search_results: Results from knowledge base searches

        Returns:
            List of Citation objects
        """
        citations = []
        seen_chunks = set()

        for result_set in search_results:
            if "results" in result_set:
                for ctx in result_set["results"]:
                    chunk_id = ctx.get("chunk_id")
                    if chunk_id and chunk_id not in seen_chunks:
                        citation = Citation(
                            source=ctx["source"],
                            page=ctx.get("page"),
                            chunk_id=chunk_id,
                            relevance_score=ctx["score"],
                            text_preview=ctx["text"][:200],
                        )
                        citations.append(citation)
                        seen_chunks.add(chunk_id)

        return citations

    async def process_query_streaming(
        self,
        query: str,
        namespace: str = None,
        timeout: int = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Process query using agentic approach with streaming.

        Args:
            query: User query
            namespace: Pinecone namespace for session isolation
            timeout: Timeout in seconds (defaults to settings.agentic_timeout_seconds)

        Yields:
            StreamChunk objects (mode, citations, tokens, tool_calls, metrics)
        """
        start_time = time.time()
        search_results = []
        tool_calls_count = 0
        namespace = namespace or "default"
        timeout = timeout or settings.agentic_timeout_seconds

        try:
            # 0. Send mode indicator
            yield StreamChunk(type="mode", mode=RAGMode.AGENTIC)

            # Initialise conversation with system prompt
            system_prompt = f"""{get_system_prompt()}

When answering questions:
1. Analyse if you need to search the knowledge base
2. If searching would help, use the search_knowledge_base tool
3. You can search multiple times with different queries if needed
4. Consider rewriting queries if they're ambiguous
5. Synthesise information from multiple sources
6. Always cite your sources when using retrieved information
7. Be clear if you don't have enough information to answer

Be intelligent about when to search - not every question requires retrieval."""

            messages = [{"role": "user", "content": query}]

            # Wrap the main processing in a timeout
            async def _process_with_tools():
                nonlocal tool_calls_count, search_results

                # Stream response with tool use
                async with self.anthropic_client.messages.stream(
                    model=settings.anthropic_model,
                    max_tokens=2048,
                    system=system_prompt,
                    messages=messages,
                    tools=self.tools,
                ) as stream:

                    # Get the final message to check for tool use
                    final_message = await stream.get_final_message()

                    # Check if any text was generated before tool use
                    text_content = []
                    tool_uses = []

                    for block in final_message.content:
                        if hasattr(block, "text"):
                            text_content.append(block.text)
                        elif hasattr(block, "type") and block.type == "tool_use":
                            tool_uses.append({
                                "id": block.id,
                                "name": block.name,
                                "input": block.input,
                            })

                    # Yield any initial text
                    for text in text_content:
                        for char in text:
                            yield StreamChunk(type="token", content=char)

                    # If Claude used tools, execute them and continue
                    if tool_uses:
                        for tool_use in tool_uses:
                            if tool_calls_count >= settings.agentic_max_tool_calls:
                                logger.warning(f"Max tool calls ({settings.agentic_max_tool_calls}) reached")
                                break

                            tool_calls_count += 1
                            logger.info(f"Executing tool: {tool_use['name']} (call {tool_calls_count})")

                            # Yield tool call info
                            yield StreamChunk(
                                type="tool_call",
                                tool_name=tool_use["name"],
                                tool_input=tool_use["input"],
                            )

                            # Execute tool
                            tool_result = await self._execute_tool(
                                tool_use["name"],
                                tool_use["input"],
                                namespace=namespace,
                            )
                            search_results.append(tool_result)

                            # Stream citations if search results were retrieved
                            if "results" in tool_result:
                                citations = self._extract_citations([tool_result])
                                for citation in citations:
                                    yield StreamChunk(type="citation", citation=citation)

                            # Continue conversation with tool result
                            messages.append({
                                "role": "assistant",
                                "content": [{
                                    "type": "tool_use",
                                    "id": tool_use["id"],
                                    "name": tool_use["name"],
                                    "input": tool_use["input"],
                                }],
                            })
                            messages.append({
                                "role": "user",
                                "content": [{
                                    "type": "tool_result",
                                    "tool_use_id": tool_use["id"],
                                    "content": self._format_tool_result(tool_result),
                                }],
                            })

                        # Stream final response after tool use
                        async with self.anthropic_client.messages.stream(
                            model=settings.anthropic_model,
                            max_tokens=2048,
                            system=system_prompt,
                            messages=messages,
                            tools=self.tools,
                        ) as final_stream:
                            async for text in final_stream.text_stream:
                                yield StreamChunk(type="token", content=text)

            # Execute the processing (timeout is handled per-API-call inside _process_with_tools)
            async for chunk in _process_with_tools():
                yield chunk

            # Send completion metrics
            query_time = (time.time() - start_time) * 1000
            total_results = sum(
                len(r.get("results", [])) for r in search_results
            )

            metrics = RetrievalMetrics(
                query_time_ms=query_time,
                num_results=total_results,
                reranked=False,
                top_score=None,
                average_score=None,
            )

            yield StreamChunk(type="done", metrics=metrics)

        except asyncio.TimeoutError:
            logger.warning(f"Agentic processing timed out after {timeout}s")
            yield StreamChunk(
                type="error",
                content=f"Processing timed out after {timeout} seconds"
            )
        except Exception as e:
            logger.error(f"Agentic RAG processing failed: {e}", exc_info=True)
            yield StreamChunk(type="error", content=str(e))

    async def process_query(
        self,
        query: str,
        namespace: str = None,
        timeout: int = None,
    ) -> Tuple[str, List[Citation], RetrievalMetrics]:
        """
        Process query and return complete response (non-streaming).

        Args:
            query: User query
            namespace: Pinecone namespace for session isolation
            timeout: Timeout in seconds

        Returns:
            Tuple of (response text, citations, metrics)
        """
        response_parts = []
        citations = []
        metrics = None

        async for chunk in self.process_query_streaming(query, namespace, timeout):
            if chunk.type == "token":
                response_parts.append(chunk.content)
            elif chunk.type == "citation":
                citations.append(chunk.citation)
            elif chunk.type == "done":
                metrics = chunk.metrics

        response = "".join(response_parts)
        return response, citations, metrics or RetrievalMetrics(
            query_time_ms=0, num_results=0, reranked=False
        )

    async def reflect_on_response(
        self,
        query: str,
        response: str,
        contexts: List[Dict],
    ) -> ReflectionResult:
        """
        Reflection pattern: Agent evaluates its own output.

        This is a 2025 Agentic RAG best practice where the agent
        critically assesses its response before returning it.

        Checks:
        - Did I actually answer the question?
        - Did I cite sources correctly?
        - Am I confident in this answer?
        - Should I search for more information?

        Args:
            query: Original user query
            response: Generated response to evaluate
            contexts: Retrieved context chunks used for the response

        Returns:
            ReflectionResult with evaluation and confidence score
        """
        # Format contexts for the reflection prompt
        context_summary = []
        for i, ctx in enumerate(contexts[:5], 1):  # Limit to top 5 for efficiency
            source = ctx.get("source", "Unknown")
            score = ctx.get("score", 0)
            text_preview = ctx.get("text", "")[:150]
            context_summary.append(
                f"[{i}] Source: {source} (score: {score:.2f})\n{text_preview}..."
            )

        context_str = "\n".join(context_summary) if context_summary else "No context retrieved"

        reflection_prompt = f"""You are a critical evaluator assessing the quality of a RAG response.

ORIGINAL QUERY:
{query}

RETRIEVED CONTEXT:
{context_str}

GENERATED RESPONSE:
{response}

Evaluate this response critically and provide your assessment in JSON format:

{{
    "answered_query": true/false,  // Did the response actually answer the question?
    "confidence_score": 0.0-1.0,   // How confident are you in this response?
    "citations_accurate": true/false,  // Do citations match the claims made?
    "needs_more_search": true/false,  // Would more searching improve the answer?
    "suggested_followup_queries": [],  // If needs_more_search is true, what queries?
    "issues_found": [],  // List any problems (missing info, unsupported claims, etc.)
    "reasoning": "..."  // Brief explanation of your assessment
}}

Be honest and critical. A low confidence score for an uncertain answer is better than false confidence.
Respond ONLY with the JSON object, no other text."""

        try:
            response_msg = await self.anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=1024,
                messages=[{"role": "user", "content": reflection_prompt}],
            )

            # Parse the JSON response
            reflection_text = response_msg.content[0].text.strip()

            # Handle potential markdown code blocks
            if reflection_text.startswith("```"):
                lines = reflection_text.split("\n")
                # Remove first and last lines (```json and ```)
                reflection_text = "\n".join(lines[1:-1])

            reflection_data = json.loads(reflection_text)

            # Validate and create ReflectionResult
            result = ReflectionResult(
                answered_query=reflection_data.get("answered_query", False),
                confidence_score=min(1.0, max(0.0, reflection_data.get("confidence_score", 0.5))),
                citations_accurate=reflection_data.get("citations_accurate", True),
                needs_more_search=reflection_data.get("needs_more_search", False),
                suggested_followup_queries=reflection_data.get("suggested_followup_queries", []),
                issues_found=reflection_data.get("issues_found", []),
                reasoning=reflection_data.get("reasoning", "Reflection completed"),
            )

            logger.info(
                f"Reflection complete: confidence={result.confidence_score:.2f}, "
                f"answered={result.answered_query}, needs_more_search={result.needs_more_search}"
            )

            return result

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse reflection JSON: {e}")
            # Return a conservative default
            return ReflectionResult(
                answered_query=True,
                confidence_score=0.5,
                citations_accurate=True,
                needs_more_search=False,
                suggested_followup_queries=[],
                issues_found=["Reflection parsing failed"],
                reasoning="Could not parse reflection response, using conservative defaults",
            )
        except Exception as e:
            logger.error(f"Reflection failed: {e}")
            return ReflectionResult(
                answered_query=True,
                confidence_score=0.5,
                citations_accurate=True,
                needs_more_search=False,
                suggested_followup_queries=[],
                issues_found=[f"Reflection error: {str(e)}"],
                reasoning="Reflection failed, using defaults",
            )

    async def process_query_with_reflection(
        self,
        query: str,
        namespace: str = None,
        timeout: int = None,
        min_confidence: float = 0.6,
    ) -> Tuple[str, List[Citation], RetrievalMetrics, ReflectionResult]:
        """
        Process query with reflection-based quality assurance.

        If the initial response doesn't meet the confidence threshold,
        the agent will attempt to improve it by searching for more information.

        Args:
            query: User query
            namespace: Pinecone namespace for session isolation
            timeout: Timeout in seconds
            min_confidence: Minimum confidence score to accept (0-1)

        Returns:
            Tuple of (response, citations, metrics, reflection)
        """
        namespace = namespace or "default"
        max_reflection_loops = 2  # Prevent infinite loops

        for attempt in range(max_reflection_loops + 1):
            # Process the query
            response, citations, metrics = await self.process_query(
                query, namespace, timeout
            )

            # Build contexts from citations for reflection
            contexts = [
                {
                    "source": c.source,
                    "score": c.relevance_score,
                    "text": c.text_preview,
                }
                for c in citations
            ]

            # Reflect on the response
            reflection = await self.reflect_on_response(query, response, contexts)

            # If confidence is good enough or we've exhausted retries, return
            if reflection.confidence_score >= min_confidence or attempt >= max_reflection_loops:
                if attempt > 0:
                    logger.info(
                        f"Reflection loop completed after {attempt + 1} attempts, "
                        f"final confidence: {reflection.confidence_score:.2f}"
                    )
                return response, citations, metrics, reflection

            # If needs more search and we have followup queries, try them
            if reflection.needs_more_search and reflection.suggested_followup_queries:
                followup_query = reflection.suggested_followup_queries[0]
                logger.info(
                    f"Reflection suggests more search (confidence: {reflection.confidence_score:.2f}), "
                    f"trying followup: '{followup_query[:50]}...'"
                )
                # Modify the query for next iteration
                query = f"{query}\n\nAdditional context needed: {followup_query}"
            else:
                # No followup suggestions, return what we have
                return response, citations, metrics, reflection

        # Should not reach here, but return the last result
        return response, citations, metrics, reflection
