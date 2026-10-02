import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.agent_execution import AgentExecution, AgentStep
from app.models.enums import AgentExecutionStatus, AgentName
from app.schemas.agent import AgentExecutionOut
from app.schemas.common import Page
from app.utils.pagination import paginate

router = APIRouter(prefix="/agent-executions", tags=["agent-executions"])


@router.get("", response_model=Page[AgentExecutionOut])
async def list_agent_executions(
    agent: AgentName | None = None,
    status_filter: AgentExecutionStatus | None = None,
    page: int = 1,
    page_size: int = 20,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AgentExecution).where(AgentExecution.organization_id == uuid.UUID(user.org_id))
    if agent:
        stmt = stmt.where(AgentExecution.agent == agent)
    if status_filter:
        stmt = stmt.where(AgentExecution.status == status_filter)
    return await paginate(db, stmt.order_by(AgentExecution.created_at.desc()), AgentExecutionOut, page, page_size)


@router.get("/{execution_id}", response_model=AgentExecutionOut)
async def get_agent_execution(execution_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    execution = await db.get(AgentExecution, execution_id)
    if execution is None or str(execution.organization_id) != user.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent execution not found")
    return execution


@router.get("/{execution_id}/steps")
async def get_agent_execution_steps(
    execution_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    execution = await db.get(AgentExecution, execution_id)
    if execution is None or str(execution.organization_id) != user.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent execution not found")
    result = await db.execute(
        select(AgentStep).where(AgentStep.execution_id == execution.id).order_by(AgentStep.step_index)
    )
    steps = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "step_index": s.step_index,
            "step_name": s.step_name,
            "tool_name": s.tool_name,
            "tool_input": s.tool_input,
            "tool_output": s.tool_output,
            "reasoning": s.reasoning,
            "status": s.status,
            "error": s.error,
        }
        for s in steps
    ]
