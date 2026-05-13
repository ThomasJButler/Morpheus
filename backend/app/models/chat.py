"""
Pydantic models for chat API requests and responses.
Provides type safety and validation for chat interactions.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RAGMode(str, Enum):
    """
    RAG processing modes for tiered retrieval.

    - SIMPLE: Fast semantic search only (~800ms, lowest cost)
    - HYBRID: Dense + Sparse (BM25) retrieval with fusion (~1200ms)
    - AGENTIC: Claude as autonomous agent with tool use (~2600ms, highest accuracy)
    - AUTO: Intelligent routing based on query analysis
    """

    SIMPLE = "simple"
    HYBRID = "hybrid"
    AGENTIC = "agentic"
    AUTO = "auto"


class QueryType(str, Enum):
    """
    Query classification for intelligent routing.
    Determines which RAG mode is most appropriate.
    """

    FACTUAL = "factual"  # Direct fact lookup → SimpleRAG
    CONCEPTUAL = "conceptual"  # Understanding concepts → HybridRAG
    COMPARATIVE = "comparative"  # Compare/contrast → HybridRAG or Agentic
    PROCEDURAL = "procedural"  # How-to questions → HybridRAG
    EXPLORATORY = "exploratory"  # Open-ended → AgenticRAG
    MULTI_PART = "multi_part"  # Multiple questions → AgenticRAG


class QueryAnalysis(BaseModel):
    """
    Analysis result from query analyzer.
    Used for intelligent mode routing in AUTO mode.
    """

    complexity_score: float = Field(
        ..., ge=0, le=1, description="Query complexity (0=simple, 1=complex)"
    )
    query_type: QueryType = Field(..., description="Classified query type")
    suggested_mode: RAGMode = Field(..., description="Recommended RAG mode")
    keywords: List[str] = Field(default=[], description="Extracted key terms")
    is_ambiguous: bool = Field(
        default=False, description="Whether query contains ambiguity"
    )
    needs_rewriting: bool = Field(
        default=False, description="Whether query would benefit from rewriting"
    )
    reasoning: Optional[str] = Field(None, description="Explanation for mode selection")


class Citation(BaseModel):
    """
    Citation information for retrieved context.
    Links response content back to source documents.
    """

    source: str = Field(..., description="Source document identifier")
    page: Optional[int] = Field(None, description="Page number if applicable")
    chunk_id: Optional[str] = Field(None, description="Unique chunk identifier")
    relevance_score: float = Field(..., description="Relevance score (0-1)")
    text_preview: str = Field(..., description="Preview of cited text", max_length=200)


class RetrievalMetrics(BaseModel):
    """
    Metrics about the retrieval process.
    Useful for debugging and performance monitoring.
    """

    query_time_ms: float = Field(
        ..., description="Query execution time in milliseconds"
    )
    num_results: int = Field(..., description="Number of results retrieved")
    reranked: bool = Field(default=False, description="Whether reranking was applied")
    top_score: Optional[float] = Field(None, description="Highest relevance score")
    average_score: Optional[float] = Field(None, description="Average relevance score")


class EnhancedRetrievalMetrics(RetrievalMetrics):
    """
    Extended metrics for tiered RAG system.
    Includes mode information and escalation details.
    """

    mode_used: RAGMode = Field(..., description="RAG mode that was used")
    mode_confidence: float = Field(
        default=1.0, ge=0, le=1, description="Confidence in mode selection"
    )
    query_rewritten: bool = Field(
        default=False, description="Whether query was rewritten"
    )
    original_query: Optional[str] = Field(
        None, description="Original query if rewritten"
    )
    escalated_from: Optional[RAGMode] = Field(
        None, description="Previous mode if escalation occurred"
    )
    escalation_reason: Optional[str] = Field(
        None, description="Reason for escalation if applicable"
    )
    tool_calls_made: int = Field(
        default=0, description="Number of tool calls (agentic mode)"
    )
    dense_score: Optional[float] = Field(
        None, description="Dense retrieval score (hybrid mode)"
    )
    sparse_score: Optional[float] = Field(
        None, description="Sparse/BM25 score (hybrid mode)"
    )


class ChatMessage(BaseModel):
    """
    Individual chat message.
    Can be from user or assistant.
    """

    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="Message timestamp"
    )
    citations: Optional[List[Citation]] = Field(
        None, description="Citations for this message"
    )


class Session(BaseModel):
    """
    Conversation session with history and metadata.
    Tracks multi-turn conversations for context-aware responses.
    """

    session_id: str = Field(..., description="Unique session identifier")
    messages: List[ChatMessage] = Field(default=[], description="Conversation history")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Session creation time"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Last update time"
    )
    metadata: dict = Field(default={}, description="Additional session metadata")

    def add_message(
        self, role: str, content: str, citations: Optional[List[Citation]] = None
    ):
        """Add a message to the conversation history."""
        message = ChatMessage(role=role, content=content, citations=citations)
        self.messages.append(message)
        self.updated_at = datetime.now()

    def get_recent_messages(self, limit: int = 10) -> List[ChatMessage]:
        """Get the most recent messages from history."""
        return self.messages[-limit:]

    def get_context_string(self, limit: int = 5) -> str:
        """
        Get recent conversation as formatted string for context.

        Args:
            limit: Number of recent messages to include

        Returns:
            Formatted conversation history
        """
        recent = self.get_recent_messages(limit)
        formatted = []
        for msg in recent:
            formatted.append(f"{msg.role.capitalize()}: {msg.content}")
        return "\n".join(formatted)


class ChatRequest(BaseModel):
    """
    Request payload for chat endpoint.
    Supports both single message format and Vercel AI SDK messages array format.
    """

    # Single message format (legacy)
    message: Optional[str] = Field(None, description="User's message (legacy format)")

    # Vercel AI SDK format (messages array)
    messages: Optional[List[dict]] = Field(
        None, description="Array of message objects with 'role' and 'content'"
    )

    session_id: Optional[str] = Field(
        None, description="Session identifier for context"
    )
    stream: bool = Field(default=True, description="Whether to stream the response")
    history: Optional[List[ChatMessage]] = Field(
        default=None, description="Conversation history"
    )

    # RAG Mode Configuration
    rag_mode: RAGMode = Field(
        default=RAGMode.AUTO, description="RAG mode: simple, hybrid, agentic, or auto"
    )
    deep_mode: bool = Field(
        default=False, description="Force agentic mode for complex queries"
    )
    return_analysis: bool = Field(
        default=False, description="Include query analysis in response"
    )

    class Config:
        # Allow extra fields from Vercel AI SDK (like 'id', 'data', etc.)
        extra = "allow"
        json_schema_extra = {
            "example": {
                "messages": [{"role": "user", "content": "What is RAG?"}],
                "stream": True,
                "rag_mode": "auto",
            }
        }


class ChatResponse(BaseModel):
    """
    Response from chat endpoint.
    Contains answer, citations, and metadata.
    """

    message: str = Field(..., description="Assistant's response")
    citations: List[Citation] = Field(default=[], description="Source citations")
    metrics: Optional[RetrievalMetrics] = Field(None, description="Retrieval metrics")
    confidence: Optional[float] = Field(
        None, description="Confidence score (0-1)", ge=0, le=1
    )
    session_id: Optional[str] = Field(None, description="Session identifier")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="Response timestamp"
    )
    # Enhanced RAG fields
    query_analysis: Optional[QueryAnalysis] = Field(
        None, description="Query analysis if requested"
    )
    rag_mode_used: Optional[RAGMode] = Field(
        None, description="Which RAG mode was used"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "message": "RAG stands for Retrieval-Augmented Generation...",
                "citations": [
                    {
                        "source": "rag-overview.pdf",
                        "page": 1,
                        "relevance_score": 0.95,
                        "text_preview": "RAG combines retrieval and generation...",
                    }
                ],
                "confidence": 0.92,
                "rag_mode_used": "hybrid",
            }
        }


class StreamChunk(BaseModel):
    """
    Individual chunk in a streaming response.
    Sent via Server-Sent Events (SSE).

    Types:
    - 'token': Text content chunk
    - 'citation': Source citation
    - 'mode': RAG mode being used (sent early in stream)
    - 'analysis': Query analysis (if requested)
    - 'tool_call': Tool call in agentic mode
    - 'reflection': Agent self-reflection result (2025 pattern)
    - 'done': Stream complete with metrics
    - 'error': Error occurred
    """

    type: str = Field(
        ...,
        description="Chunk type: 'token', 'citation', 'mode', 'analysis', 'tool_call', 'reflection', 'done', 'error'",
    )
    content: Optional[str] = Field(None, description="Text content if type=token")
    citation: Optional[Citation] = Field(None, description="Citation if type=citation")
    metrics: Optional[RetrievalMetrics] = Field(
        None, description="Metrics if type=done"
    )
    error: Optional[str] = Field(None, description="Error message if type=error")
    # Enhanced RAG fields
    mode: Optional[RAGMode] = Field(None, description="RAG mode if type=mode")
    analysis: Optional[QueryAnalysis] = Field(
        None, description="Query analysis if type=analysis"
    )
    tool_name: Optional[str] = Field(None, description="Tool name if type=tool_call")
    tool_input: Optional[dict] = Field(None, description="Tool input if type=tool_call")


class ReflectionResult(BaseModel):
    """
    Result from agent self-reflection on its response.
    Part of the 2025 Agentic RAG "Reflection" pattern.

    The agent evaluates its own output to:
    - Check if it actually answered the question
    - Verify citations are correct
    - Assess confidence level
    - Determine if more searching is needed
    """

    answered_query: bool = Field(
        ..., description="Whether the response actually answers the query"
    )
    confidence_score: float = Field(
        ..., ge=0, le=1, description="Confidence in the response quality (0-1)"
    )
    citations_accurate: bool = Field(
        ..., description="Whether citations accurately support claims"
    )
    needs_more_search: bool = Field(
        default=False, description="Whether additional searching would improve response"
    )
    suggested_followup_queries: List[str] = Field(
        default=[], description="Suggested queries if more search is needed"
    )
    issues_found: List[str] = Field(
        default=[], description="Any issues identified with the response"
    )
    reasoning: str = Field(..., description="Explanation of the reflection assessment")


class HealthResponse(BaseModel):
    """
    Health check response.
    """

    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.now)
    pinecone_connected: bool = Field(..., description="Pinecone connection status")
    index_stats: Optional[dict] = Field(None, description="Pinecone index statistics")
