import uuid
from datetime import date

from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import EvidenceSufficiency


class Evidence(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "evidence"

    control_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("controls.id"), nullable=False, index=True)
    document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    collected_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    assessments: Mapped[list["EvidenceAssessment"]] = relationship(back_populates="evidence")


class EvidenceAssessment(Base, UUIDPKMixin, TimestampMixin):
    """Given obligation + control + evidence, is the evidence sufficient? (Feature 7)"""

    __tablename__ = "evidence_assessments"

    evidence_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=False, index=True)
    obligation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=True
    )
    control_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("controls.id"), nullable=True)
    sufficiency: Mapped[EvidenceSufficiency] = mapped_column(
        Enum(EvidenceSufficiency, name="evidence_sufficiency_enum"), nullable=False
    )
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)

    evidence: Mapped["Evidence"] = relationship(back_populates="assessments")
