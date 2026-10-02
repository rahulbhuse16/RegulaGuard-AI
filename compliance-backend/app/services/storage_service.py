"""
Cloudinary-only file storage.

All uploaded files are stored in Cloudinary.
There is no local filesystem storage or local fallback.
"""

import io
import uuid
from pathlib import Path

import cloudinary
import cloudinary.uploader
import requests
from app.core.config import settings





cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)



def generate_storage_key(original_filename: str) -> str:
    """
    Generates a unique Cloudinary public ID.

    The user-provided filename is never used directly as a path.
    """
    ext = Path(original_filename).suffix.lower()

    if len(ext) > 10:
        ext = ""

    return f"{uuid.uuid4().hex}{ext}"


def save_file(storage_key: str, content: bytes) -> None:
    """
    Upload file to Cloudinary.
    """

    provider = settings.STORAGE_PROVIDER.lower()

    if provider != "cloudinary":
        raise ValueError(
            f"Unsupported STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}. "
            "Only 'cloudinary' is supported."
        )

    result = cloudinary.uploader.upload(
        io.BytesIO(content),
        public_id=storage_key,
        resource_type="raw",
        overwrite=True,
    )

    return None


def read_file(storage_key: str) -> bytes:
    """
    Download a file from Cloudinary and return its bytes.
    """

    provider = settings.STORAGE_PROVIDER.lower()

    if provider != "cloudinary":
        raise ValueError(
            f"Unsupported STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}. "
            "Only 'cloudinary' is supported."
        )

    url = cloudinary.utils.cloudinary_url(
        storage_key,
        resource_type="raw",
        secure=True,
    )[0]

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    return response.content