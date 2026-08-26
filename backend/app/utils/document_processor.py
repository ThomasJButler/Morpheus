"""Extract text from uploaded files.

pypdf for PDF, python-docx for DOCX, a plain read for txt and md. The caps
bound the parser's work on a hostile file (SECURITY_REVIEW F4): breaching one
raises DocumentTooLarge, malformed input raises DocumentProcessingError, and
the upload route maps both to a 4xx with a fixed message, never a traceback.
"""

from __future__ import annotations

from pathlib import Path


class DocumentProcessingError(Exception):
    """The file could not be parsed. The message is safe to show a client."""


class DocumentTooLarge(DocumentProcessingError):
    """A page or character cap was breached."""


SUPPORTED_SUFFIXES = {".pdf", ".txt", ".md", ".docx"}


def extract(path: Path, *, max_pdf_pages: int, max_text_chars: int) -> list[dict]:
    """Return [{"text": str, "page": int | None}]: one entry per PDF page,
    one for the whole file otherwise."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(path, max_pdf_pages, max_text_chars)
    if suffix in (".txt", ".md"):
        return _extract_plain(path, max_text_chars)
    if suffix == ".docx":
        return _extract_docx(path, max_text_chars)
    raise DocumentProcessingError(f"Unsupported file type: {suffix or 'no extension'}")


def _extract_pdf(path: Path, max_pages: int, max_chars: int) -> list[dict]:
    import pypdf

    try:
        reader = pypdf.PdfReader(path)
        if reader.is_encrypted:
            # Try the empty password (plenty of "encrypted" PDFs use it).
            # A real password is out of scope.
            try:
                reader.decrypt("")
            except Exception as exc:
                raise DocumentProcessingError("This PDF is password protected.") from exc
        page_count = len(reader.pages)
        if page_count > max_pages:
            raise DocumentTooLarge(
                f"PDF has {page_count} pages; the limit is {max_pages}."
            )
        out: list[dict] = []
        total = 0
        for number, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if not text:
                continue
            total += len(text)
            if total > max_chars:
                raise DocumentTooLarge(
                    f"Extracted text exceeds {max_chars} characters."
                )
            out.append({"text": text, "page": number})
    except DocumentProcessingError:
        raise
    except Exception as exc:
        # pypdf raises a zoo of exception types on malformed input; the
        # client gets one fixed sentence, the log gets the traceback.
        raise DocumentProcessingError("Could not read this PDF.") from exc
    if not out:
        raise DocumentProcessingError(
            "No extractable text in this PDF. Scanned-image PDFs need OCR, "
            "which Morpheus doesn't do."
        )
    return out


def _extract_plain(path: Path, max_chars: int) -> list[dict]:
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        # Legacy encodings happen; replacing the odd byte beats rejecting a
        # perfectly readable document.
        text = raw.decode("utf-8", errors="replace")
    text = text.strip()
    if len(text) > max_chars:
        raise DocumentTooLarge(f"File text exceeds {max_chars} characters.")
    if not text:
        raise DocumentProcessingError("The file is empty.")
    return [{"text": text, "page": None}]


def _extract_docx(path: Path, max_chars: int) -> list[dict]:
    import docx

    try:
        document = docx.Document(str(path))
        parts = [p.text.strip() for p in document.paragraphs if p.text.strip()]
        for table in document.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    parts.append(" | ".join(cells))
    except Exception as exc:
        raise DocumentProcessingError("Could not read this DOCX.") from exc
    text = "\n".join(parts).strip()
    if len(text) > max_chars:
        raise DocumentTooLarge(f"Extracted text exceeds {max_chars} characters.")
    if not text:
        raise DocumentProcessingError("No extractable text in this DOCX.")
    return [{"text": text, "page": None}]
