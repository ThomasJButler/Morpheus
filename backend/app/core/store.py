"""The library: one LanceDB table on disk under DATA_DIR/lancedb.

Chunk ids are deterministic (sha256 of source, index and text), so identical
content maps to identical rows. Re-uploading a source replaces it. Deleting a
source removes its rows and then compacts old table versions, so deleted text
is gone from the disk, not just from queries; test_store proves that by
grepping the data directory for a nonce after deletion.

meta.json records which embedding model built the index. Opening the store
with a different model refuses (StoreModelMismatch) instead of silently
mixing vector spaces, because "search quietly got worse" is the kind of bug
nobody files.

Retrieval is vector-only, or hybrid: vector and BM25 full text fused with
reciprocal rank fusion in plain Python. Ten transparent lines beat an opaque
reranker object, and the vector floor is applied before fusion so a weak
semantic match can't ride in on rank alone (isq-agent's weight-before-floor
principle).
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path

import lancedb
import pyarrow as pa
from lancedb.index import FTS

logger = logging.getLogger(__name__)

RRF_K = 60  # the standard reciprocal-rank-fusion constant


class StoreError(Exception):
    pass


class StoreModelMismatch(StoreError):
    pass


def chunk_id(source: str, index: int, text: str) -> str:
    key = f"{source}\x00{index}\x00{text}".encode()
    return hashlib.sha256(key).hexdigest()[:16]


def _escape(value: str) -> str:
    """Escape a string for a LanceDB SQL predicate."""
    return value.replace("'", "''")


class Store:
    TABLE = "chunks"

    def __init__(self, path: Path, *, embed_model: str):
        self.path = Path(path)
        self.path.mkdir(parents=True, exist_ok=True)
        self.embed_model = embed_model
        self._meta_path = self.path / "meta.json"
        self.dim: int | None = None
        # ponytail: one process-wide write lock. Writes are delete + add +
        # index rebuild + compaction, four commits that must not interleave
        # across request threads. Per-table locks if this ever serves more
        # than one user, which it is not built to.
        self._write_lock = threading.Lock()
        if self._meta_path.exists():
            meta = json.loads(self._meta_path.read_text())
            if meta.get("embed_model") != embed_model:
                raise StoreModelMismatch(
                    f"This index was built with {meta.get('embed_model')!r} but the "
                    f"configured embedding model is {embed_model!r}. Re-index "
                    f"(delete {self.path}) or set OLLAMA_EMBED_MODEL back."
                )
            self.dim = meta.get("dim")
        else:
            self._write_meta()
        self._db = lancedb.connect(self.path)
        self._table = (
            self._db.open_table(self.TABLE)
            if self.TABLE in self._db.table_names()
            else None
        )

    def _write_meta(self) -> None:
        self._meta_path.write_text(
            json.dumps(
                {
                    "embed_model": self.embed_model,
                    "dim": self.dim,
                    "created_at": datetime.now(UTC).isoformat(),
                },
                indent=2,
            )
        )

    # -- writes ------------------------------------------------------------

    def add_document(
        self, source: str, chunks: list[dict], vectors: list[list[float]]
    ) -> dict:
        if len(chunks) != len(vectors):
            raise StoreError("chunks and vectors differ in length")
        if not chunks:
            raise StoreError("nothing to add")
        dim = len(vectors[0])
        if self.dim is None:
            self.dim = dim
            self._write_meta()
        elif dim != self.dim:
            raise StoreModelMismatch(
                f"Vector dimension {dim} does not match this index ({self.dim})."
            )
        with self._write_lock:
            return self._add_locked(source, chunks, vectors)

    def _add_locked(self, source: str, chunks: list[dict], vectors: list[list[float]]) -> dict:
        replaced = source in self.sources()
        now = datetime.now(UTC).isoformat()
        rows = [
            {
                "id": chunk_id(source, i, chunk["text"]),
                "source": source,
                "chunk_index": i,
                "page": chunk.get("page"),
                "text": chunk["text"],
                "added_at": now,
                "vector": vector,
            }
            for i, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]
        if self._table is None:
            schema = pa.schema(
                [
                    pa.field("id", pa.string()),
                    pa.field("source", pa.string()),
                    pa.field("chunk_index", pa.int32()),
                    pa.field("page", pa.int32()),
                    pa.field("text", pa.string()),
                    pa.field("added_at", pa.string()),
                    pa.field("vector", pa.list_(pa.float32(), self.dim)),
                ]
            )
            self._table = self._db.create_table(self.TABLE, data=rows, schema=schema)
        else:
            if replaced:
                self._table.delete(f"source = '{_escape(source)}'")
            self._table.add(rows)
        # Full FTS rebuild on every write: the index is static, so new rows
        # would otherwise be invisible to BM25. Milliseconds at library scale.
        self._table.create_index("text", config=FTS(), replace=True)
        if replaced:
            # A replace is a delete in the user's eyes: compact so the old
            # text leaves the disk, not just the query results (second-pass
            # review F29; the delete path always did this).
            self._purge()
        return {"chunks": len(rows), "replaced": replaced}

    def delete_source(self, source: str) -> bool:
        with self._write_lock:
            if self._table is None or source not in self.sources():
                return False
            self._table.delete(f"source = '{_escape(source)}'")
            if self._table.count_rows() > 0:
                self._table.create_index("text", config=FTS(), replace=True)
            self._purge()
            return True

    def clear(self) -> None:
        with self._write_lock:
            if self.TABLE in self._db.table_names():
                self._db.drop_table(self.TABLE)
            self._table = None

    def _purge(self) -> None:
        """Compact away old table versions so deleted text leaves the disk."""
        try:
            self._table.optimize(
                cleanup_older_than=timedelta(0), delete_unverified=True
            )
        except Exception:
            # Hygiene, not correctness of a response; log loudly, don't fail
            # the request. The nonce-grep test still fails if this rots.
            logger.warning("Store compaction failed", exc_info=True)

    # -- reads -------------------------------------------------------------

    def sources(self) -> set[str]:
        if self._table is None:
            return set()
        rows = self._table.search().select(["source"]).limit(10_000_000).to_list()
        return {r["source"] for r in rows}

    def list_documents(self) -> list[dict]:
        if self._table is None:
            return []
        rows = (
            self._table.search()
            .select(["source", "page", "added_at"])
            .limit(10_000_000)
            .to_list()
        )
        by_source: dict[str, dict] = {}
        for row in rows:
            doc = by_source.setdefault(
                row["source"],
                {
                    "source": row["source"],
                    "chunks": 0,
                    "pages": None,
                    "added_at": row["added_at"],
                },
            )
            doc["chunks"] += 1
            if row.get("page") is not None:
                doc["pages"] = max(doc["pages"] or 0, row["page"])
            doc["added_at"] = min(doc["added_at"], row["added_at"])
        return sorted(by_source.values(), key=lambda d: d["added_at"])

    def stats(self) -> dict:
        size = sum(f.stat().st_size for f in self.path.rglob("*") if f.is_file())
        if self._table is None:
            return {"documents": 0, "chunks": 0, "size_bytes": size}
        return {
            "documents": len(self.sources()),
            "chunks": self._table.count_rows(),
            "size_bytes": size,
        }

    def search(
        self,
        *,
        vector: list[float],
        query_text: str,
        mode: str = "hybrid",
        k: int = 6,
        candidates: int = 20,
        min_vector_score: float = 0.5,
    ) -> list[dict]:
        if self._table is None or self._table.count_rows() == 0:
            return []

        query = self._table.search(vector)
        # lancedb renamed metric() to distance_type(); support both so a pin
        # bump doesn't silently change the metric.
        query = (
            query.distance_type("cosine")
            if hasattr(query, "distance_type")
            else query.metric("cosine")
        )
        vector_rows = query.limit(candidates).to_list()
        # Floor before fusion: a vector hit below the floor is dropped
        # entirely rather than surviving on rank.
        vector_hits = []
        for row in vector_rows:
            similarity = 1.0 - float(row.get("_distance", 1.0))
            if similarity >= min_vector_score:
                vector_hits.append((row, similarity))
        vector_hits.sort(key=lambda pair: pair[1], reverse=True)

        if mode == "vector":
            return [self._hit(row, score) for row, score in vector_hits[:k]]

        fts_rows: list[dict] = []
        try:
            fts_rows = (
                self._table.search(query_text, query_type="fts")
                .limit(candidates)
                .to_list()
            )
        except Exception:
            logger.debug("FTS query failed; using vector results only", exc_info=True)

        fused: dict[str, float] = {}
        rows_by_id: dict[str, dict] = {}
        for rank, (row, _similarity) in enumerate(vector_hits, start=1):
            fused[row["id"]] = fused.get(row["id"], 0.0) + 1.0 / (RRF_K + rank)
            rows_by_id[row["id"]] = row
        for rank, row in enumerate(fts_rows, start=1):
            fused[row["id"]] = fused.get(row["id"], 0.0) + 1.0 / (RRF_K + rank)
            rows_by_id.setdefault(row["id"], row)
        if not fused:
            return []
        top = max(fused.values())
        ranked = sorted(fused.items(), key=lambda kv: kv[1], reverse=True)[:k]
        # Scores are relative to the best hit (1.0 = top). RRF's raw numbers
        # are meaningless to a human; relative relevance isn't.
        return [self._hit(rows_by_id[i], value / top) for i, value in ranked]

    @staticmethod
    def _hit(row: dict, score: float) -> dict:
        return {
            "id": row["id"],
            "source": row["source"],
            "page": row.get("page"),
            "chunk_index": row.get("chunk_index"),
            "text": row.get("text", ""),
            "score": round(float(score), 4),
        }
