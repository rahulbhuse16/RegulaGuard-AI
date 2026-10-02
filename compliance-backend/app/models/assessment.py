import uuid

from sqlalchemy import Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import GapCategory, RiskPriority


class ComplianceAssessment(Base, UUIDPKMixin, TimestampMixin):
    """Aggregate assessment tying obligation + control + evidence into one traceable conclusion."""

    __tablename__ = "compliance_assessments"

    obligation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=False, index=True
    )
    control_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("controls.id"), nullable=True)
    is_compliant: Mapped[bool | None] = mapped_column(nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)

    gaps: Mapped[list["ComplianceGap"]] = relationship(back_populates="compliance_assessment")


class ComplianceGap(Base, UUIDPKMixin, TimestampMixin):
    """Feature 8 — gap identification."""

    __tablename__ = "compliance_gaps"

    compliance_assessment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("compliance_assessments.id"), nullable=True
    )
    compliance_assessment: Mapped["ComplianceAssessment"] = relationship(back_populates="gaps")

    obligation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulatory_obligations.id"), nullable=True, index=True
    )
    control_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("controls.id"), nullable=True)
    evidence_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=True)
    category: Mapped[GapCategory] = mapped_column(Enum(GapCategory, name="gap_category_enum"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_open: Mapped[bool] = mapped_column(default=True, nullable=False)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)

    risk_assessments: Mapped[list["RiskAssessment"]] = relationship(back_populates="gap")


class RiskAssessment(Base, UUIDPKMixin, TimestampMixin):
    """Feature 9 — deterministic, explainable risk scoring (see services/risk_engine.py)."""

    __tablename__ = "risk_assessments"

    gap_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("compliance_gaps.id"), nullable=False, index=True)

    regulatory_impact: Mapped[float] = mapped_column(Float, nullable=False)
    customer_impact: Mapped[float] = mapped_column(Float, nullable=False)
    financial_impact: Mapped[float] = mapped_column(Float, nullable=False)
    business_impact: Mapped[float] = mapped_column(Float, nullable=False)
    likelihood: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[float] = mapped_column(Float, nullable=False)
    urgency: Mapped[float] = mapped_column(Float, nullable=False)

    score: Mapped[float] = mapped_column(Float, nullable=False)
    priority: Mapped[RiskPriority] = mapped_column(Enum(RiskPriority, name="risk_priority_enum"), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)

    gap: Mapped["ComplianceGap"] = relationship(back_populates="risk_assessments")
