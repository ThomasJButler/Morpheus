import json
import subprocess

import pytest

from app.core.store import Store, StoreModelMismatch, chunk_id
from tests.fakes import fake_embed

NONCE = "NONCE_KANGAROO_4417"

CHUNKS = [
    {"text": "Remote work is allowed three days a week with manager approval.", "page": 1},
    {"text": f"The quarterly budget for the Leeds office is 42,000 pounds. {NONCE}", "page": 2},
    {"text": "Laptops must use full disk encryption and error code zx99qq means a failed unlock.", "page": 3},
]


def vectors_for(chunks):
    return [fake_embed(c["text"]) for c in chunks]


@pytest.fixture
def store(tmp_path):
    return Store(tmp_path / "lancedb", embed_model="nomic-embed-text")


def add_handbook(store, source="handbook.md"):
    return store.add_document(source, CHUNKS, vectors_for(CHUNKS))


def test_chunk_id_deterministic_and_distinct():
    a = chunk_id("doc.md", 0, "same text")
    assert a == chunk_id("doc.md", 0, "same text")
    assert a != chunk_id("doc.md", 1, "same text")
    assert a != chunk_id("other.md", 0, "same text")


def test_add_stats_and_listing(store):
    result = add_handbook(store)
    assert result == {"chunks": 3, "replaced": False}
    stats = store.stats()
    assert stats["documents"] == 1
    assert stats["chunks"] == 3
    assert stats["size_bytes"] > 0
    docs = store.list_documents()
    assert docs[0]["source"] == "handbook.md"
    assert docs[0]["chunks"] == 3
    assert docs[0]["pages"] == 3


def test_reupload_replaces_not_duplicates(store):
    add_handbook(store)
    fewer = CHUNKS[:2]
    result = store.add_document("handbook.md", fewer, vectors_for(fewer))
    assert result["replaced"] is True
    assert store.stats() == {
        "documents": 1,
        "chunks": 2,
        "size_bytes": store.stats()["size_bytes"],
    }


def test_vector_search_ranks_similar_text_first(store):
    add_handbook(store)
    hits = store.search(
        vector=fake_embed("how many days of remote work are allowed"),
        query_text="how many days of remote work are allowed",
        mode="vector",
        min_vector_score=0.2,
    )
    assert hits
    assert "Remote work" in hits[0]["text"]
    assert hits[0]["score"] >= 0.2


def test_vector_floor_drops_everything_when_high(store):
    add_handbook(store)
    hits = store.search(
        vector=fake_embed("something else entirely unrelated"),
        query_text="something else entirely unrelated",
        mode="vector",
        min_vector_score=0.99,
    )
    assert hits == []


def test_hybrid_bm25_rescues_a_rare_token(store):
    add_handbook(store)
    # The query vector shares no words with the target chunk, and the floor
    # is set high enough that vector search contributes nothing. BM25 on the
    # rare token has to carry it.
    hits = store.search(
        vector=fake_embed("completely different words about gardening"),
        query_text="zx99qq",
        mode="hybrid",
        min_vector_score=0.9,
    )
    assert hits
    assert "zx99qq" in hits[0]["text"]
    assert hits[0]["score"] == 1.0  # scores are relative to the top hit


def test_hybrid_scores_relative_and_bounded(store):
    add_handbook(store)
    hits = store.search(
        vector=fake_embed("remote work days"),
        query_text="remote work days",
        mode="hybrid",
        min_vector_score=0.1,
    )
    assert hits[0]["score"] == 1.0
    assert all(0.0 < h["score"] <= 1.0 for h in hits)


def test_delete_source_really_deletes_from_disk(store, tmp_path):
    add_handbook(store)
    assert store.delete_source("handbook.md") is True
    assert store.sources() == set()
    assert (
        store.search(
            vector=fake_embed(NONCE), query_text=NONCE, min_vector_score=0.0
        )
        == []
    )
    # The claim is "deleted means gone from disk", so grep the actual bytes.
    result = subprocess.run(
        ["grep", "-rl", NONCE, str(tmp_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.stdout.strip() == "", f"nonce still on disk in: {result.stdout}"


def test_delete_missing_source_is_false(store):
    assert store.delete_source("nope.md") is False


def test_clear_then_reuse(store):
    add_handbook(store)
    store.clear()
    assert store.stats()["documents"] == 0
    add_handbook(store)
    assert store.stats()["chunks"] == 3


def test_model_mismatch_refused(tmp_path):
    Store(tmp_path / "lancedb", embed_model="nomic-embed-text")
    with pytest.raises(StoreModelMismatch) as exc:
        Store(tmp_path / "lancedb", embed_model="bge-m3")
    assert "nomic-embed-text" in str(exc.value)


def test_dimension_mismatch_refused(store):
    add_handbook(store)  # dim 64 from fake_embed
    with pytest.raises(StoreModelMismatch):
        store.add_document("tiny.md", [{"text": "hi", "page": None}], [[0.1, 0.2]])


def test_health_reports_store_mismatch(tmp_path, fake_ollama):
    # Pre-build a store with a different model, then boot the app against it.
    from app.core.config import get_settings

    lance_dir = get_settings().data_dir / "lancedb"
    lance_dir.mkdir(parents=True)
    (lance_dir / "meta.json").write_text(
        json.dumps({"embed_model": "bge-m3", "dim": 1024})
    )
    from fastapi.testclient import TestClient

    from app.main import app

    app.state.ollama = fake_ollama
    with TestClient(app, raise_server_exceptions=False) as client:
        body = client.get("/api/health").json()
    app.state.ollama = None
    assert body["status"] == "degraded"
    assert "bge-m3" in body["store"]["error"]
    assert any("Re-index" in h for h in body["hints"])


def test_reupload_purges_old_text_from_disk(store, tmp_path):
    old_nonce, new_nonce = "NONCEOLD7431", "NONCENEW9925"
    store.add_document("n.md", [{"text": f"first {old_nonce}", "page": None}], [fake_embed(old_nonce)])
    store.add_document("n.md", [{"text": f"second {new_nonce}", "page": None}], [fake_embed(new_nonce)])
    result = subprocess.run(["grep", "-rl", old_nonce, str(tmp_path)], capture_output=True, text=True, check=False)
    assert result.stdout.strip() == "", f"replaced text still on disk in: {result.stdout}"
    assert subprocess.run(["grep", "-rl", new_nonce, str(tmp_path)], capture_output=True, text=True, check=False).stdout


def test_concurrent_adds_all_land(store):
    from concurrent.futures import ThreadPoolExecutor

    def add(i):
        return store.add_document(f"doc{i}.md", [{"text": f"text {i}", "page": None}], [fake_embed(f"text {i}")])

    with ThreadPoolExecutor(4) as pool:
        list(pool.map(add, range(8)))
    assert store.stats()["documents"] == 8
    assert store.stats()["chunks"] == 8
