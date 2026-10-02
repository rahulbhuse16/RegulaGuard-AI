import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import RemediationProvenance, RemediationTaskStatus, RiskPriority


class Remediation(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "remediations"

    gap_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("compliance_gaps.id"), nullable=False, index=True)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposed_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    priority: Mapped[RiskPriority | None] = mapped_column(Enum(RiskPriority, name="remediation_priority_enum"), nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    dependencies: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_required_after: Mapped[str | None] = mapped_column(Text, nullable=True)

    provenance: Mapped[RemediationProvenance] = mapped_column(
        Enum(RemediationProvenance, name="remediation_provenance_enum"), default=RemediationProvenance.AI_GENERATED, nullable=False
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    agent_execution_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=True)

    tasks: Mapped[list["RemediationTask"]] = relationship(back_populates="remediation")


class RemediationTask(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "remediation_tasks"

    remediation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("remediations.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    assignee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[RemediationTaskStatus] = mapped_column(
        Enum(RemediationTaskStatus, name="remediation_task_status_enum"), default=RemediationTaskStatus.NOT_STARTED, nullable=False
    )

    remediation: Mapped["Remediation"] = relationship(back_populates="tasks")
