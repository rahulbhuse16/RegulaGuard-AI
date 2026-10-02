import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.models.enums import AgentExecutionStatus, AgentName


class AgentExecution(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "agent_executions"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    agent: Mapped[AgentName] = mapped_column(Enum(AgentName, name="agent_name_enum"), nullable=False)
    task: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[AgentExecutionStatus] = mapped_column(
        Enum(AgentExecutionStatus, name="agent_execution_status_enum"), default=AgentExecutionStatus.QUEUED, nullable=False
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_step: Mapped[str | None] = mapped_column(String(255), nullable=True)

    input_ref: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    output_ref: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    tools_used: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    documents_accessed: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    errors: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confidence: Mapped[float | None] = mapped_column(nullable=True)
    final_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    requested_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    steps: Mapped[list["AgentStep"]] = relationship(back_populates="execution", cascade="all, delete-orphan")


class AgentStep(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "agent_steps"

    execution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=False, index=True)
    step_index: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    tool_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tool_input: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tool_output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="COMPLETED")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    execution: Mapped["AgentExecution"] = relationship(back_populates="steps")
