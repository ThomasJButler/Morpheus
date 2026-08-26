"""Split text into overlapping chunks.

A recursive-flavoured character splitter in about forty lines. The langchain
splitter this replaces dragged langchain-core and langsmith into the
dependency tree for what is, at heart, "cut at the nicest boundary that
fits".

Guarantees, enforced by tests: no chunk longer than chunk_size, consecutive
chunks share an overlap, every part of the input lands in at least one
chunk, and the output is deterministic.
"""

_SEPARATORS = ("\n\n", "\n", ". ", " ")


def chunk_text(text: str, *, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    # An overlap of half the chunk or more would mostly re-embed the same text.
    overlap = max(0, min(overlap, chunk_size // 2))
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        cut = end
        if end < len(text):
            # Prefer a natural boundary in the second half of the window, so
            # chunks stay big and sentences stay whole.
            for separator in _SEPARATORS:
                found = text.rfind(separator, start + chunk_size // 2, end)
                if found != -1:
                    cut = found + len(separator)
                    break
        piece = text[start:cut].strip()
        if piece:
            chunks.append(piece)
        if cut >= len(text):
            break
        start = max(cut - overlap, start + 1)
    return chunks
