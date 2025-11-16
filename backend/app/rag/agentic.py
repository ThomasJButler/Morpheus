"""
Agentic RAG implementation using Claude's tool use capability.

Claude acts as an intelligent agent that:
- Analyses queries to understand intent
- Decides when retrieval is necessary
- May rewrite queries for better results
- Performs multiple searches if needed
- Synthesises responses with proper citations
"""

import json
import logging
import time
from typing import AsyncGenerator, Dict, List, Optional, Tuple

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.pinecone_client import get_pinecone_client
from app.models.chat import Citation, RAGMode, RetrievalMetrics, StreamChunk

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
        self.dense_index, self.sparse_index = self.pinecone_client.get_both_indexes()

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
            response = await self.openai_client.embeddings.create(
                model=settings.embedding_model, input=query
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise

    async def _search_knowledge_base(
        self, query: str, top_k: int = 5
    ) -> List[Dict]:
        """
        Execute search against knowledge base.

        Args:
            query: Search query
            top_k: Number of results to retrieve

        Returns:
            List of search results with text and metadata
        """
        try:
            # Generate query embedding
            query_embedding = await self._embed_query(query)

            # Search dense index
            results = self.dense_index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
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

            logger.info(f"Retrieved {len(contexts)} results for query: {query}")
            return contexts

        except Exception as e:
            logger.error(f"Knowledge base search failed: {e}")
            return []

    async def _execute_tool(
        self, tool_name: str, tool_input: Dict
    ) -> Dict:
        """
        Execute tool requested by Claude.

        Args:
            tool_name: Name of the tool to execute
            tool_input: Input parameters for the tool

        Returns:
            Tool execution result
        """
        if tool_name == "search_knowledge_base":
            query = tool_input.get("query", "")
            top_k = tool_input.get("top_k", 5)

            results = await self._search_knowledge_base(query, top_k)

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

            logger.info(f"Query rewritten: '{original}' → '{rewritten}' ({reasoning})")

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
        self, query: str, session_id: Optional[str] = None
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Process query using agentic approach with streaming.

        Args:
            query: User query
            session_id: Optional session ID for conversation context

        Yields:
            StreamChunk objects (citations, tokens, metrics)
        """
        start_time = time.time()
        search_results = []

        try:
            # Initialise conversation with system prompt
            system_prompt = """You are a helpful AI assistant with access to a knowledge base.

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

            # Stream response with tool use
            async with self.anthropic_client.messages.stream(
                model=settings.anthropic_model,
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
                tools=self.tools,
            ) as stream:

                # Track tool uses during streaming
                tool_uses = []
                current_tool_use = None

                async for event in stream:
                    # Handle different event types
                    if event.type == "content_block_start":
                        if hasattr(event.content_block, "type"):
                            if event.content_block.type == "tool_use":
                                current_tool_use = {
                                    "id": event.content_block.id,
                                    "name": event.content_block.name,
                                    "input": {},
                                }

                    elif event.type == "content_block_delta":
                        if hasattr(event.delta, "type"):
                            if event.delta.type == "text_delta":
                                # Stream text tokens to user
                                yield StreamChunk(type="token", content=event.delta.text)

                            elif event.delta.type == "input_json_delta":
                                # Accumulate tool input
                                if current_tool_use:
                                    current_tool_use["input"] = json.loads(
                                        event.delta.partial_json
                                    )

                    elif event.type == "content_block_stop":
                        if current_tool_use:
                            tool_uses.append(current_tool_use)
                            current_tool_use = None

                # If Claude used tools, execute them and continue
                if tool_uses:
                    for tool_use in tool_uses:
                        logger.info(f"Executing tool: {tool_use['name']}")

                        # Execute tool
                        tool_result = await self._execute_tool(
                            tool_use["name"],
                            tool_use["input"]
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
                        async for event in final_stream:
                            if event.type == "content_block_delta":
                                if hasattr(event.delta, "type"):
                                    if event.delta.type == "text_delta":
                                        yield StreamChunk(
                                            type="token",
                                            content=event.delta.text
                                        )

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

        except Exception as e:
            logger.error(f"Agentic RAG processing failed: {e}", exc_info=True)
            yield StreamChunk(type="error", content=str(e))

    async def process_query(
        self, query: str, session_id: Optional[str] = None
    ) -> Tuple[str, List[Citation], RetrievalMetrics]:
        """
        Process query and return complete response (non-streaming).

        Args:
            query: User query
            session_id: Optional session ID

        Returns:
            Tuple of (response text, citations, metrics)
        """
        response_parts = []
        citations = []
        metrics = None

        async for chunk in self.process_query_streaming(query, session_id):
            if chunk.type == "token":
                response_parts.append(chunk.content)
            elif chunk.type == "citation":
                citations.append(chunk.citation)
            elif chunk.type == "done":
                metrics = chunk.metrics

        response = "".join(response_parts)
        return response, citations, metrics or RetrievalMetrics()
