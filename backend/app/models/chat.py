"""
Pydantic models for chat API requests and responses.
Provides type safety and validation for chat interactions.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RAGMode(str, Enum):
    """Available RAG processing modes."""

    SIMPLE = "simple"
    HYBRID = "hybrid"
    CASCADING = "cascading"
    AGENTIC = "agentic"


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

    query_time_ms: float = Field(..., description="Query execution time in milliseconds")
    num_results: int = Field(..., description="Number of results retrieved")
    reranked: bool = Field(default=False, description="Whether reranking was applied")
    top_score: Optional[float] = Field(None, description="Highest relevance score")
    average_score: Optional[float] = Field(None, description="Average relevance score")


class ChatMessage(BaseModel):
    """
    Individual chat message.
    Can be from user or assistant.
    """

    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")
    citations: Optional[List[Citation]] = Field(None, description="Citations for this message")


class Session(BaseModel):
    """
    Conversation session with history and metadata.
    Tracks multi-turn conversations for context-aware responses.
    """

    session_id: str = Field(..., description="Unique session identifier")
    messages: List[ChatMessage] = Field(default=[], description="Conversation history")
    created_at: datetime = Field(default_factory=datetime.now, description="Session creation time")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update time")
    mode: RAGMode = Field(default=RAGMode.SIMPLE, description="Default RAG mode for session")
    metadata: dict = Field(default={}, description="Additional session metadata")

    def add_message(self, role: str, content: str, citations: Optional[List[Citation]] = None):
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
    """

    message: str = Field(..., description="User's message", min_length=1, max_length=2000)
    mode: RAGMode = Field(default=RAGMode.SIMPLE, description="RAG processing mode")
    session_id: Optional[str] = Field(None, description="Session identifier for context")
    stream: bool = Field(default=True, description="Whether to stream the response")
    history: Optional[List[ChatMessage]] = Field(
        default=None, description="Conversation history"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "message": "What is RAG?",
                "mode": "simple",
                "session_id": "abc123",
                "stream": True,
            }
        }


class ChatResponse(BaseModel):
    """
    Response from chat endpoint.
    Contains answer, citations, and metadata.
    """

    message: str = Field(..., description="Assistant's response")
    citations: List[Citation] = Field(default=[], description="Source citations")
    mode: RAGMode = Field(..., description="RAG mode used")
    metrics: Optional[RetrievalMetrics] = Field(None, description="Retrieval metrics")
    confidence: Optional[float] = Field(
        None, description="Confidence score (0-1)", ge=0, le=1
    )
    session_id: Optional[str] = Field(None, description="Session identifier")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="Response timestamp"
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
                "mode": "simple",
                "confidence": 0.92,
            }
        }


class StreamChunk(BaseModel):
    """
    Individual chunk in a streaming response.
    Sent via Server-Sent Events (SSE).
    """

    type: str = Field(..., description="Chunk type: 'token', 'citation', 'done'")
    content: Optional[str] = Field(None, description="Text content if type=token")
    citation: Optional[Citation] = Field(None, description="Citation if type=citation")
    metrics: Optional[RetrievalMetrics] = Field(
        None, description="Metrics if type=done"
    )


class HealthResponse(BaseModel):
    """
    Health check response.
    """

    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.now)
    pinecone_connected: bool = Field(..., description="Pinecone connection status")
    index_stats: Optional[dict] = Field(None, description="Pinecone index statistics")
