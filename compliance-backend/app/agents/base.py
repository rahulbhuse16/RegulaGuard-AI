"""
Shared agent execution scaffolding.

Every specialized agent (ObligationExtractionAgent, ControlMappingAgent, ...)
should wrap its work in an `AgentRun` so that AgentExecution/AgentStep rows
are always created, giving full observability + idempotency + failure
recovery for free, regardless of which agent is running.
"""
from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.agent_execution import AgentExecution, AgentStep
from app.models.enums import AgentExecutionStatus, AgentName

logger = get_logger(__name__)


class AgentRun:
    """
    Usage:

        async with AgentRun(db, org_id, AgentName.OBLIGATION_EXTRACTION, "extract obligations",
                             idempotency_key=f"extract:{version_id}") as run:
            run.log_step("retrieve_chunks", tool_name="retrieve_document_chunks", tool_input={...})
            ...
            await run.complete({"obligations_created": 3}, confidence=0.82)
    """

    def __init__(
        self,
        db: AsyncSession,
        organization_id: uuid.UUID,
        agent: AgentName,
        task: str,
        idempotency_key: Optional[str] = None,
        requested_by_id: Optional[uuid.UUID] = None,
        max_retries: int = 2,
    ):
        self.db = db
        self.organization_id = organization_id
        self.agent = agent
        self.task = task
        self.idempotency_key = idempotency_key
        self.requested_by_id = requested_by_id
        self.max_retries = max_retries
        self.execution: Optional[AgentExecution] = None
        self._step_index = 0

    async def _get_existing(self) -> Optional[AgentExecution]:
        if not self.idempotency_key:
            return None
        result = await self.db.execute(
            select(AgentExecution).where(AgentExecution.idempotency_key == self.idempotency_key)
        )
        return result.scalar_one_or_none()

    async def __aenter__(self) -> "AgentRun":
        existing = await self._get_existing()
        if existing and existing.status in (AgentExecutionStatus.COMPLETED, AgentExecutionStatus.RUNNING):
            # Idempotent short-circuit: caller should check `.is_replay` and skip re-doing work.
            self.execution = existing
            self.is_replay = True
            return self

        self.is_replay = False
        self.execution = AgentExecution(
            organization_id=self.organization_id,
            agent=self.agent,
            task=self.task,
            status=AgentExecutionStatus.RUNNING,
            idempotency_key=self.idempotency_key,
            started_at=datetime.now(timezone.utc),
            requested_by_id=self.requested_by_id,
        )
        self.db.add(self.execution)
        await self.db.flush()
        logger.info("agent_execution_started", agent=self.agent.value, execution_id=str(self.execution.id))
        return self

    async def log_step(
        self,
        step_name: str,
        tool_name: Optional[str] = None,
        tool_input: Optional[dict] = None,
        tool_output: Optional[dict] = None,
        reasoning: Optional[str] = None,
        status: str = "COMPLETED",
        error: Optional[str] = None,
    ) -> None:
        self._step_index += 1
        step = AgentStep(
            execution_id=self.execution.id,
            step_index=self._step_index,
            step_name=step_name,
            tool_name=tool_name,
            tool_input=tool_input,
            tool_output=tool_output,
            reasoning=reasoning,
            status=status,
            error=error,
        )
        self.db.add(step)
        self.execution.current_step = step_name
        if tool_name:
            self.execution.tools_used = [*self.execution.tools_used, tool_name]
        await self.db.flush()

    async def wait_for_review(self) -> None:
        self.execution.status = AgentExecutionStatus.WAITING_REVIEW
        await self.db.flush()

    async def complete(self, final_result: dict[str, Any], confidence: Optional[float] = None) -> None:
        self.execution.status = AgentExecutionStatus.COMPLETED
        self.execution.completed_at = datetime.now(timezone.utc)
        self.execution.final_result = final_result
        self.execution.confidence = confidence
        await self.db.flush()

    async def fail(self, error_message: str) -> None:
        self.execution.status = AgentExecutionStatus.FAILED
        self.execution.completed_at = datetime.now(timezone.utc)
        self.execution.errors = [*self.execution.errors, {"message": error_message, "retry": self.execution.retry_count}]
        await self.db.flush()
        logger.error("agent_execution_failed", agent=self.agent.value, execution_id=str(self.execution.id), error=error_message)

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        if exc_type is not None and self.execution and self.execution.status == AgentExecutionStatus.RUNNING:
            await self.fail(str(exc))
            # Do not swallow the exception; let the caller's route handler
            # translate it into a structured HTTP error.
            return False
        return False
