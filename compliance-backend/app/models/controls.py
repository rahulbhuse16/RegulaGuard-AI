import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import ControlEffectiveness, MappingStatus, ReviewStatus


class BusinessUnit(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "business_units"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class Product(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "products"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("business_units.id"), nullable=True)


class Policy(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "policies"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)

    controls: Mapped[list["Control"]] = relationship(back_populates="policy")


class Control(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "controls"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    policy_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("policies.id"), nullable=True)
    control_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("business_units.id"), nullable=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    control_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_preventive: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_automated: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    evidence_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    testing_procedure: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)

    policy: Mapped["Policy"] = relationship(back_populates="controls")
    tests: Mapped[list["ControlTest"]] = relationship(back_populates="control")


class ControlMapping(Base, UUIDPKMixin, TimestampMixin):
    """AI-assisted regulation-to-control mapping (Feature 5)."""

    __tablename__ = "control_mappings"

    obligation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=False, index=True
    )
    control_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("controls.id"), nullable=False, index=True)
    status: Mapped[MappingStatus] = mapped_column(Enum(MappingStatus, name="mapping_status_enum"), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, name="mapping_review_status_enum"), default=ReviewStatus.PENDING, nullable=False
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)


class ControlTest(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "control_tests"

    control_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("controls.id"), nullable=False, index=True)
    test_date: Mapped[date] = mapped_column(Date, nullable=False)
    tester: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result: Mapped[ControlEffectiveness] = mapped_column(
        Enum(ControlEffectiveness, name="control_test_result_enum"), nullable=False
    )
    exceptions_noted: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)

    control: Mapped["Control"] = relationship(back_populates="tests")


class ControlAssessment(Base, UUIDPKMixin, TimestampMixin):
    """Result of Feature 6 (control effectiveness assessment workflow)."""

    __tablename__ = "control_assessments"

    control_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("controls.id"), nullable=False, index=True)
    effectiveness: Mapped[ControlEffectiveness] = mapped_column(
        Enum(ControlEffectiveness, name="control_assessment_effectiveness_enum"), nullable=False
    )
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_evidence_ids: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)
