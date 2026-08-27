"""Request, response and stream-event models for the chat and document APIs."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RetrievalMode(str, Enum):
    HYBRID = "hybrid"  # vector + BM25, fused with reciprocal rank fusion
    VECTOR = "vector"  # vector only


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=4000)
    mode: RetrievalMode = RetrievalMode.HYBRID
    # Deep mode: the model proposes up to a few sub-questions, each is
    # retrieved separately, results are fused, one answer is generated.
    deep: bool = False
    # Optional override for the configured chat model. Must be installed in
    # Ollama; the backend never substitutes a different model.
    model: str | None = Field(None, max_length=120)


class Citation(BaseModel):
    """A verified citation: index is the [n] marker the answer used, chunk_id
    is the retrieved chunk it maps to. Only markers that map to a retrieved
    chunk ever reach the client (app/rag/citations.py)."""

    index: int
    chunk_id: str
    source: str
    page: int | None = None
    text_preview: str
    score: float


class DoneInfo(BaseModel):
    retrieved: int
    cited: int
    # False when the answer used no valid citation (or nothing was retrieved).
    # The UI shows this rather than pretending.
    grounded: bool
    model: str
    mode: RetrievalMode
    deep: bool = False
    retrieval_ms: float = 0.0
    generation_ms: float = 0.0
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class StreamEvent(BaseModel):
    """One SSE `data:` payload. `type` says which optional fields are set."""

    type: Literal["mode", "token", "citation", "done", "error"]
    content: str | None = None
    citation: Citation | None = None
    done: DoneInfo | None = None
    mode: RetrievalMode | None = None
    deep: bool | None = None
    model: str | None = None
    code: str | None = None
    message: str | None = None

    def sse(self) -> str:
        return self.model_dump_json(exclude_none=True)


class DocumentInfo(BaseModel):
    source: str
    chunks: int
    pages: int | None = None
    added_at: str
