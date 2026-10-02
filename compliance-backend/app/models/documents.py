import uuid
from datetime import date

from pgvector.sqlalchemy import Vector
from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import DocumentStatus, DocumentType


class Document(Base, UUIDPKMixin, TimestampMixin):
    """Raw uploaded document metadata. Physical storage is abstracted away (see services/storage)."""

    __tablename__ = "documents"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, name="document_type_enum"), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status_enum"), default=DocumentStatus.UPLOADED, nullable=False
    )
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Regulatory metadata (nullable — only applies to REGULATION-type docs)
    regulator_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("regulators.id"), nullable=True)
    jurisdiction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jurisdictions.id"), nullable=True)
    regulation_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulation_versions.id"), nullable=True
    )
    publication_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base, UUIDPKMixin, TimestampMixin):
    """A structure-preserving chunk of a document with its embedding for semantic retrieval."""

    __tablename__ = "document_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section: Mapped[str | None] = mapped_column(String(512), nullable=True)
    subsection: Mapped[str | None] = mapped_column(String(512), nullable=True)
    heading: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(settings.EMBEDDING_DIM), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    document: Mapped["Document"] = relationship(back_populates="chunks")


class SourceCitation(Base, UUIDPKMixin, TimestampMixin):
    """
    Reusable citation model. Any AI-generated conclusion that references source
    material should create one or more SourceCitation rows pointing back to it,
    linked via (citing_entity_type, citing_entity_id).
    """

    __tablename__ = "source_citations"

    citing_entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    citing_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    document_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_chunks.id"), nullable=True
    )
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    relevance: Mapped[float | None] = mapped_column(nullable=True)
    extraction_confidence: Mapped[float | None] = mapped_column(nullable=True)
