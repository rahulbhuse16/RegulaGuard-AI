"""
Embedding provider abstraction.

Uses FastEmbed through LangChain Community.
"""

from functools import lru_cache
from typing import List

from langchain_community.embeddings import FastEmbedEmbeddings

from app.core.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


@lru_cache
def _get_embedding_model():
    return FastEmbedEmbeddings(
        model_name=settings.EMBEDDING_MODEL
    )


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []

    provider = settings.EMBEDDING_PROVIDER.lower()

    if provider == "local":
        model = _get_embedding_model()

        vectors = model.embed_documents(texts)

        return [list(vector) for vector in vectors]

    raise ValueError(
        f"Unsupported EMBEDDING_PROVIDER: {settings.EMBEDDING_PROVIDER}"
    )


def embed_query(text: str) -> List[float]:
    model = _get_embedding_model()

    return list(model.embed_query(text))