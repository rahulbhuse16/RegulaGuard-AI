import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import ChangeType, ReviewStatus


class Regulator(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "regulators"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    short_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Jurisdiction(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "jurisdictions"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    country_code: Mapped[str | None] = mapped_column(String(8), nullable=True)


class Regulation(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "regulations"

    regulator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("regulators.id"), nullable=False, index=True)
    jurisdiction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jurisdictions.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_demo_data: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    versions: Mapped[list["RegulationVersion"]] = relationship(back_populates="regulation", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("regulator_id", "title", "code", name="uq_regulation_identity"),)


class RegulationVersion(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "regulation_versions"

    regulation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=False, index=True
    )
    version_label: Mapped[str] = mapped_column(String(64), nullable=False)
    publication_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    regulation: Mapped["Regulation"] = relationship(back_populates="versions")
    obligations: Mapped[list["RegulatoryObligation"]] = relationship(back_populates="regulation_version")

    __table_args__ = (UniqueConstraint("regulation_id", "version_label", name="uq_regulation_version_label"),)


class RegulatoryChange(Base, UUIDPKMixin, TimestampMixin):
    """A detected diff between two regulation versions (Feature 2)."""

    __tablename__ = "regulatory_changes"

    regulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=False, index=True)
    from_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulation_versions.id"), nullable=True
    )
    to_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulation_versions.id"), nullable=False
    )
    change_type: Mapped[ChangeType] = mapped_column(Enum(ChangeType, name="change_type_enum"), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    from_section_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    to_section_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    from_chunk_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("document_chunks.id"), nullable=True)
    to_chunk_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("document_chunks.id"), nullable=True)
    impact_analysis_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)


class RegulatoryObligation(Base, UUIDPKMixin, TimestampMixin):
    """Extracted, human-reviewable obligation (Feature 3)."""

    __tablename__ = "regulatory_obligations"

    regulation_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulation_versions.id"), nullable=False, index=True
    )
    obligation_text: Mapped[str] = mapped_column(Text, nullable=False)
    requirement_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    jurisdiction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jurisdictions.id"), nullable=True)
    regulator_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("regulators.id"), nullable=True)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    responsible_function: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    review_status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, name="obligation_review_status_enum"), default=ReviewStatus.PENDING, nullable=False
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_chunk_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("document_chunks.id"), nullable=True)
    extraction_agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True
    )

    regulation_version: Mapped["RegulationVersion"] = relationship(back_populates="obligations")
    applicability_rules: Mapped[list["ApplicabilityRule"]] = relationship(back_populates="obligation")


class ApplicabilityRule(Base, UUIDPKMixin, TimestampMixin):
    """Defines which business units / products / jurisdictions an obligation applies to."""

    __tablename__ = "applicability_rules"

    obligation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=False, index=True
    )
    business_unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("business_units.id"), nullable=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    jurisdiction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jurisdictions.id"), nullable=True)
    condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    obligation: Mapped["RegulatoryObligation"] = relationship(back_populates="applicability_rules")
