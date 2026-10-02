import pytest

from app.ingestion.pipeline import IngestionValidationError, chunk_text, validate_upload


def test_validate_upload_rejects_oversized_file():
    with pytest.raises(IngestionValidationError):
        validate_upload("reg.pdf", "application/pdf", 100 * 1024 * 1024)


def test_validate_upload_rejects_unsupported_mime_type():
    with pytest.raises(IngestionValidationError):
        validate_upload("reg.exe", "application/x-msdownload", 1000)


def test_validate_upload_rejects_unsafe_filename():
    with pytest.raises(IngestionValidationError):
        validate_upload("../../etc/passwd", "application/pdf", 1000)


def test_validate_upload_accepts_valid_pdf():
    validate_upload("basel-iii-framework.pdf", "application/pdf", 5000)  # should not raise


def test_chunk_text_preserves_page_markers():
    text = "[PAGE 1]\nFirst page content here about capital requirements.\n[PAGE 2]\nSecond page content about disclosure."
    chunks = chunk_text(text)
    pages = {meta["page_number"] for _, meta in chunks}
    assert 1 in pages
    assert 2 in pages


def test_chunk_text_splits_long_content_into_multiple_chunks():
    long_text = "Regulatory requirement text. " * 500  # far exceeds CHUNK_TARGET_CHARS
    chunks = chunk_text(long_text)
    assert len(chunks) > 1
    for content, _ in chunks:
        assert len(content) <= 1500 + 1  # allow for boundary rounding


def test_chunk_text_never_returns_empty_chunks():
    chunks = chunk_text("Short obligation text.")
    assert all(content.strip() for content, _ in chunks)
