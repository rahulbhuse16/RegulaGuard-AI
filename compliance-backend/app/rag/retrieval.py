"""
Grounded retrieval: metadata filtering + pgvector cosine similarity search.

Never pass an entire document to the LLM — always retrieve the relevant
chunks first so generation stays grounded and citations stay accurate.
"""
from __future__ import annotations

import uuid
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documents import DocumentChunk
from app.services.embedding_service import embed_query


async def retrieve_chunks(
    db: AsyncSession,
    query: str,
    document_id: Optional[uuid.UUID] = None,
    regulation_version_id: Optional[uuid.UUID] = None,
    top_k: int = 8,
) -> Sequence[DocumentChunk]:
    """
    Retrieves the top_k most semantically relevant chunks, optionally scoped
    by document_id (metadata filter applied before the vector search).
    """
    query_embedding = embed_query(query)

    stmt = select(DocumentChunk)
    if document_id is not None:
        stmt = stmt.where(DocumentChunk.document_id == document_id)
    if regulation_version_id is not None:
        stmt = stmt.join(DocumentChunk.document).where(
            DocumentChunk.document.has(regulation_version_id=regulation_version_id)  # type: ignore[attr-defined]
        )

    stmt = stmt.order_by(DocumentChunk.embedding.cosine_distance(query_embedding)).limit(top_k)

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_all_chunks_for_document(db: AsyncSession, document_id: uuid.UUID) -> Sequence[DocumentChunk]:
    stmt = select(DocumentChunk).where(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index)
    result = await db.execute(stmt)
    return result.scalars().all()
