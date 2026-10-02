"""
Document ingestion pipeline (Feature 1):

Upload -> Validate -> Store metadata -> Extract text -> Chunk -> Embed ->
Persist chunks -> Index -> Ready
"""
from __future__ import annotations

import re
import uuid
from typing import List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.documents import Document, DocumentChunk
from app.models.enums import DocumentStatus
from app.services.embedding_service import embed_texts

logger = get_logger(__name__)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
CHUNK_TARGET_CHARS = 1500
CHUNK_OVERLAP_CHARS = 200


class IngestionValidationError(Exception):
    pass


def validate_upload(filename: str, mime_type: str, size_bytes: int) -> None:
    if size_bytes <= 0 or size_bytes > MAX_FILE_SIZE_BYTES:
        raise IngestionValidationError(f"File size {size_bytes} bytes is outside the allowed range")
    if mime_type not in ALLOWED_MIME_TYPES:
        raise IngestionValidationError(f"Unsupported MIME type: {mime_type}")
    if not re.match(r"^[\w\-. ]+$", filename):
        raise IngestionValidationError("Filename contains unsupported characters")


def extract_text(file_bytes: bytes, mime_type: str) -> str:
    if mime_type == "application/pdf":
        from io import BytesIO

        from pypdf import PdfReader

        reader = PdfReader(BytesIO(file_bytes))
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append(f"\n[PAGE {i + 1}]\n{text}")
        return "".join(pages)
    # text/plain, text/markdown fallback
    return file_bytes.decode("utf-8", errors="replace")


def chunk_text(raw_text: str) -> List[Tuple[str, dict]]:
    """
    Structure-preserving chunking: splits on page markers first, then on
    headings (markdown-style or ALL-CAPS lines), then falls back to a
    sliding window so no chunk exceeds CHUNK_TARGET_CHARS.

    Returns list of (chunk_content, metadata) tuples where metadata may
    include page_number / heading / section when detected.
    """
    chunks: List[Tuple[str, dict]] = []

    page_pattern = re.compile(r"\[PAGE (\d+)\]")
    pages = page_pattern.split(raw_text)
    # pages = ["", "1", "<page1 text>", "2", "<page2 text>", ...] when markers exist
    if len(pages) > 1:
        it = iter(pages[1:])
        page_units = list(zip(it, it))
    else:
        page_units = [(None, raw_text)]

    heading_pattern = re.compile(r"^(#{1,4}\s+.+|[A-Z][A-Z \d.\-]{6,})$", re.MULTILINE)

    for page_number, page_text in page_units:
        page_num = int(page_number) if page_number else None
        segments = heading_pattern.split(page_text)
        current_heading = None
        buffer = ""
        for seg in segments:
            if seg is None:
                continue
            if heading_pattern.match(seg.strip()):
                if buffer.strip():
                    chunks.extend(_sliding_window(buffer, page_num, current_heading))
                current_heading = seg.strip()
                buffer = ""
            else:
                buffer += seg
        if buffer.strip():
            chunks.extend(_sliding_window(buffer, page_num, current_heading))

    if not chunks:
        chunks = _sliding_window(raw_text, None, None)

    return chunks


def _sliding_window(text: str, page_number: int | None, heading: str | None) -> List[Tuple[str, dict]]:
    text = text.strip()
    if not text:
        return []
    result = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_TARGET_CHARS, len(text))
        piece = text[start:end].strip()
        if piece:
            result.append((piece, {"page_number": page_number, "heading": heading}))
        if end == len(text):
            break
        start = end - CHUNK_OVERLAP_CHARS
    return result


async def ingest_document(db: AsyncSession, document: Document, file_bytes: bytes) -> Document:
    """Runs the full pipeline against an already-persisted Document row."""
    try:
        document.status = DocumentStatus.EXTRACTING
        await db.flush()

        raw_text = extract_text(file_bytes, document.mime_type)

        document.status = DocumentStatus.CHUNKING
        await db.flush()
        raw_chunks = chunk_text(raw_text)

        document.status = DocumentStatus.EMBEDDING
        await db.flush()
        embeddings = embed_texts([c[0] for c in raw_chunks])

        for idx, ((content, meta), vector) in enumerate(zip(raw_chunks, embeddings)):
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=idx,
                    page_number=meta.get("page_number"),
                    heading=meta.get("heading"),
                    section=meta.get("heading"),
                    content=content,
                    token_count=len(content.split()),
                    embedding=vector,
                    metadata_json=meta,
                )
            )

        document.status = DocumentStatus.READY
        await db.flush()
        logger.info("document_ingested", document_id=str(document.id), chunk_count=len(raw_chunks))
        return document
    except Exception as exc:  # noqa: BLE001
        document.status = DocumentStatus.FAILED
        document.failure_reason = str(exc)[:2000]
        await db.flush()
        logger.error("document_ingestion_failed", document_id=str(document.id), error=str(exc))
        raise
