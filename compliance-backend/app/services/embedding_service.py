"""
Embedding provider abstraction. Default uses a local sentence-transformers
model so the demo works without any paid embeddings API. Swappable via
EMBEDDING_PROVIDER.
"""
from functools import lru_cache
from typing import List

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache
def _get_local_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    provider = settings.EMBEDDING_PROVIDER.lower()
    if provider == "local":
        model = _get_local_model()
        vectors = model.encode(texts, normalize_embeddings=True)
        return [v.tolist() for v in vectors]
    raise ValueError(f"Unsupported EMBEDDING_PROVIDER: {settings.EMBEDDING_PROVIDER}")


def embed_query(text: str) -> List[float]:
    return embed_texts([text])[0]
