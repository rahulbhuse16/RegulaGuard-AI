import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPKMixin
from app.models.enums import MonitoringJobStatus


class AuditEvent(Base, UUIDPKMixin):
    """
    Immutable audit log. Rows are append-only — no application API updates or
    deletes an AuditEvent once written.
    """

    __tablename__ = "audit_events"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MonitoringJob(Base, UUIDPKMixin):
    __tablename__ = "monitoring_jobs"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[MonitoringJobStatus] = mapped_column(
        Enum(MonitoringJobStatus, name="monitoring_job_status_enum"), default=MonitoringJobStatus.SCHEDULED, nullable=False
    )
    triggered_manually: Mapped[bool] = mapped_column(default=False, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    new_documents_found: Mapped[int] = mapped_column(default=0, nullable=False)
    changes_detected: Mapped[int] = mapped_column(default=0, nullable=False)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
