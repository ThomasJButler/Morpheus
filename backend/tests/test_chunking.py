from itertools import pairwise

import pytest

from app.utils.chunking import chunk_text


def test_empty_and_whitespace():
    assert chunk_text("") == []
    assert chunk_text("   \n\t  ") == []


def test_short_text_is_one_chunk():
    assert chunk_text("hello world", chunk_size=100) == ["hello world"]


def test_invalid_chunk_size():
    with pytest.raises(ValueError):
        chunk_text("x", chunk_size=0)


def test_chunks_never_exceed_size():
    text = " ".join(f"word{i}" for i in range(600))
    chunks = chunk_text(text, chunk_size=200, overlap=40)
    assert len(chunks) > 5
    assert all(len(c) <= 200 for c in chunks)


def test_every_word_survives():
    words = [f"word{i}" for i in range(400)]
    text = " ".join(words)
    joined = " ".join(chunk_text(text, chunk_size=150, overlap=30))
    for word in words:
        assert word in joined


def test_exact_overlap_without_separators():
    # No separators anywhere, so every cut is exactly at chunk_size and the
    # overlap is byte-exact.
    text = "abcdefghij" * 50  # 500 chars
    chunks = chunk_text(text, chunk_size=100, overlap=20)
    for left, right in pairwise(chunks):
        assert right[:20] == left[-20:]


def test_prefers_sentence_boundaries():
    text = ("First sentence here. " * 20).strip()
    chunks = chunk_text(text, chunk_size=100, overlap=10)
    # Cuts should land after ". ", so chunks end with a full stop.
    assert all(c.endswith(".") for c in chunks[:-1])


def test_deterministic():
    text = "\n\n".join(f"Paragraph {i} with a bit of text." for i in range(50))
    assert chunk_text(text, chunk_size=120, overlap=25) == chunk_text(
        text, chunk_size=120, overlap=25
    )


def test_rare_token_at_the_end_is_kept():
    text = " ".join(f"filler{i}" for i in range(300)) + " flibbertigibbet"
    chunks = chunk_text(text, chunk_size=180, overlap=30)
    assert "flibbertigibbet" in chunks[-1]
