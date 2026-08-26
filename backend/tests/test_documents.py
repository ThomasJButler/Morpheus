from pathlib import Path

from app.api.documents import sanitise_filename
from tests.pdf_fixtures import make_pdf

HANDBOOK = (
    "Remote work is allowed three days a week with manager approval. "
    "Laptops must use full disk encryption and a privacy screen in public. "
) * 20


def upload(client, name, payload, content_type="text/markdown"):
    return client.post(
        "/api/documents/upload", files={"file": (name, payload, content_type)}
    )


def test_sanitise_filename():
    assert sanitise_filename("handbook.md") == "handbook.md"
    assert sanitise_filename("../../etc/passwd weird$$.md") == "passwd weird__.md"
    assert sanitise_filename("IGNORE [instructions].md") == "IGNORE _instructions_.md"
    assert sanitise_filename("résumé notes.txt") == "résumé notes.txt"
    # Backslash is not a separator on POSIX; it and the quotes are neutralised.
    assert sanitise_filename("a/b\\c'd\"e.txt") == "b_c_d_e.txt"
    assert sanitise_filename(None) == "upload"
    assert sanitise_filename("....") == "upload"
    long = sanitise_filename("a" * 300 + ".pdf")
    assert len(long) <= 120 and long.endswith(".pdf")


def test_upload_list_stats_roundtrip(client, fake_ollama):
    resp = upload(client, "handbook.md", HANDBOOK.encode())
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["source"] == "handbook.md"
    assert body["chunks"] >= 1
    assert body["replaced"] is False

    listed = client.get("/api/documents").json()["documents"]
    assert [d["source"] for d in listed] == ["handbook.md"]

    stats = client.get("/api/documents/stats").json()
    assert stats["documents"] == 1
    assert stats["chunks"] == body["chunks"]

    # nomic's asymmetric-retrieval prefix must be on every embedded chunk.
    assert fake_ollama.embed_calls
    assert all(
        text.startswith("search_document: ") for text in fake_ollama.embed_calls[0]
    )


def test_reupload_replaces(client):
    assert upload(client, "handbook.md", HANDBOOK.encode()).status_code == 200
    second = upload(client, "handbook.md", b"Much shorter handbook now.")
    assert second.status_code == 200
    assert second.json()["replaced"] is True
    assert client.get("/api/documents/stats").json()["documents"] == 1


def test_pdf_upload_has_pages(client):
    resp = upload(
        client,
        "report.pdf",
        make_pdf(["Budget is 42000 pounds", "Second page content"]),
        "application/pdf",
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["pages"] == 2


def test_unsupported_type_rejected(client):
    resp = upload(client, "malware.exe", b"MZ\x90\x00", "application/octet-stream")
    assert resp.status_code == 400
    assert ".exe" in resp.json()["detail"]


def test_oversized_body_refused_before_handler(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    get_settings.cache_clear()

    ran = []

    def spy(*args, **kwargs):
        ran.append(True)
        raise AssertionError("extract must not run for an oversized body")

    monkeypatch.setattr("app.api.documents.extract", spy)
    resp = upload(client, "big.md", b"x" * (2 * 1024 * 1024))
    assert resp.status_code == 413
    assert "1 MB" in resp.json()["detail"]
    assert ran == []


def test_chunked_oversized_body_cut_off(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    get_settings.cache_clear()

    def stream():
        # A well-formed multipart preamble so the parser keeps consuming the
        # file part; the meter has to be the thing that stops it, not a
        # parse error.
        yield (
            b"--deadbeef\r\n"
            b'Content-Disposition: form-data; name="file"; filename="big.md"\r\n'
            b"Content-Type: text/markdown\r\n\r\n"
        )
        for _ in range(4):
            yield b"y" * (512 * 1024)
        yield b"\r\n--deadbeef--\r\n"

    # No Content-Length (chunked): the middleware meters the stream and cuts
    # it off mid-part; the handler never runs.
    resp = client.post(
        "/api/documents/upload",
        content=stream(),
        headers={"Content-Type": "multipart/form-data; boundary=deadbeef"},
    )
    assert resp.status_code == 413


def tmp_dir_contents():
    from app.core.config import get_settings

    tmp = get_settings().data_dir / "tmp"
    return list(tmp.iterdir()) if tmp.exists() else []


def test_malformed_pdf_gives_422_and_no_temp_residue(client):
    resp = upload(client, "broken.pdf", b"%PDF-1.4\nnot a pdf", "application/pdf")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "Could not read this PDF."
    assert tmp_dir_contents() == []


def test_empty_file_gives_422_and_no_temp_residue(client):
    resp = upload(client, "empty.txt", b"   ", "text/plain")
    assert resp.status_code == 422
    assert tmp_dir_contents() == []


def test_embed_failure_gives_503_and_no_temp_residue(client, fake_ollama):
    fake_ollama.models = ["qwen3.5:9b"]  # embedding model gone
    resp = upload(client, "handbook.md", HANDBOOK.encode())
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "model_missing"
    assert "ollama pull nomic-embed-text" in resp.json()["detail"]["hint"]
    assert tmp_dir_contents() == []


def test_page_cap_maps_to_413(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("MAX_PDF_PAGES", "2")
    get_settings.cache_clear()
    resp = upload(
        client, "long.pdf", make_pdf(["a", "b", "c"]), "application/pdf"
    )
    assert resp.status_code == 413
    assert "limit is 2" in resp.json()["detail"]
    assert tmp_dir_contents() == []


def test_delete_one_and_404(client):
    upload(client, "handbook.md", HANDBOOK.encode())
    delete = {"source": "handbook.md"}
    assert client.post("/api/documents/delete", json=delete).status_code == 200
    assert client.post("/api/documents/delete", json=delete).status_code == 404
    assert client.get("/api/documents/stats").json()["documents"] == 0


def test_clear_all(client):
    upload(client, "one.md", b"First document with plenty of text in it.")
    upload(client, "two.md", b"Second document, also with text inside it.")
    assert client.get("/api/documents/stats").json()["documents"] == 2
    assert client.delete("/api/documents").json() == {"cleared": True}
    assert client.get("/api/documents/stats").json()["documents"] == 0


def test_uploaded_filename_never_hits_disk_raw(client):
    # The temp file uses only the sanitised suffix; the store records the
    # sanitised name. Nothing on disk carries the raw client filename.
    resp = upload(client, "weird $(rm -rf).md", b"Some content for the index.")
    assert resp.status_code == 200
    assert resp.json()["source"] == "weird __rm -rf_.md"
    from app.core.config import get_settings

    data_dir = get_settings().data_dir
    assert not any("$(" in str(p) for p in Path(data_dir).rglob("*"))


def test_large_file_part_passes_the_parser(client):
    # Starlette caps non-file multipart parts at 1MB; file parts are only
    # bounded by our own cap. This guards against a future Starlette change
    # quietly capping file uploads at 1MB.
    big = ("A sentence about office policy number %d. " * 40000) % tuple(range(40000))
    assert len(big.encode()) > 1_500_000
    resp = upload(client, "big-policy.txt", big.encode(), "text/plain")
    assert resp.status_code == 200, resp.text
    assert resp.json()["chunks"] > 100


def test_delete_with_sql_shaped_name_deletes_nothing(client):
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("handbook.md", b"The CTO is Marcus Williams.", "text/markdown")},
    )
    assert upload.status_code == 200
    for name in ["x' OR 1=1 --", "handbook.md' OR '1'='1", "handbook.md OR source LIKE '%'"]:
        resp = client.post("/api/documents/delete", json={"source": name})
        assert resp.status_code == 404, name
    listed = client.get("/api/documents").json()["documents"]
    assert [d["source"] for d in listed] == ["handbook.md"]
