"""
Storage abstraction. Physical file storage is kept separate from document
metadata so the backing store (local disk today, S3/Blob later) can be
swapped by changing STORAGE_PROVIDER only.
"""
import os
import uuid
from pathlib import Path

from app.core.config import settings


def _local_path(storage_key: str) -> Path:
    base = Path(settings.STORAGE_LOCAL_PATH)
    base.mkdir(parents=True, exist_ok=True)
    return base / storage_key


def generate_storage_key(original_filename: str) -> str:
    """Never trusts the user-provided filename directly as a path component."""
    ext = Path(original_filename).suffix.lower()
    ext = ext if len(ext) <= 10 else ""
    return f"{uuid.uuid4().hex}{ext}"


def save_file(storage_key: str, content: bytes) -> None:
    provider = settings.STORAGE_PROVIDER.lower()
    if provider == "local":
        path = _local_path(storage_key)
        with open(path, "wb") as f:
            f.write(content)
        return
    raise ValueError(f"Unsupported STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}")


def read_file(storage_key: str) -> bytes:
    provider = settings.STORAGE_PROVIDER.lower()
    if provider == "local":
        path = _local_path(storage_key)
        with open(path, "rb") as f:
            return f.read()
    raise ValueError(f"Unsupported STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}")
