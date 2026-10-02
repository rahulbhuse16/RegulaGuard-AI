import uuid
from datetime import date

from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import ContradictionReviewStatus, ContradictionType


class Simulation(Base, UUIDPKMixin, TimestampMixin):
    """Feature 12 — what-if simulation. Never mutates real compliance state; output is always labeled SIMULATION."""

    __tablename__ = "simulations"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    regulation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    jurisdiction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jurisdictions.id"), nullable=True)
    business_unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("business_units.id"), nullable=True)
    hypothetical_effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assumptions: Mapped[str | None] = mapped_column(Text, nullable=True)

    result_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    requested_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)


class CrossRegulationFinding(Base, UUIDPKMixin, TimestampMixin):
    """Feature 13 — shared/overlapping/duplicate/conflicting requirements across regulations."""

    __tablename__ = "cross_regulation_findings"

    regulation_a_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=False)
    regulation_b_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=False)
    obligation_a_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=True
    )
    obligation_b_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=True
    )
    finding_type: Mapped[str] = mapped_column(String(64), nullable=False)  # SHARED/SIMILAR/OVERLAPPING_CONTROL/DUPLICATE/CONFLICT
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)


class Contradiction(Base, UUIDPKMixin, TimestampMixin):
    """Feature 14 — potential contradiction between two requirements, pending human review."""

    __tablename__ = "contradictions"

    obligation_a_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=False
    )
    obligation_b_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=False
    )
    contradiction_type: Mapped[ContradictionType] = mapped_column(
        Enum(ContradictionType, name="contradiction_type_enum"), nullable=False
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_status: Mapped[ContradictionReviewStatus] = mapped_column(
        Enum(ContradictionReviewStatus, name="contradiction_review_status_enum"),
        default=ContradictionReviewStatus.POTENTIAL,
        nullable=False,
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)
