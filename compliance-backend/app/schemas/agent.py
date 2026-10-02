from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from app.models.enums import AgentExecutionStatus, AgentName


class AgentExecutionOut(BaseModel):
    id: str
    agent: AgentName
    task: str
    status: AgentExecutionStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    current_step: Optional[str]
    retry_count: int
    confidence: Optional[float]
    final_result: Optional[dict[str, Any]]
    errors: list

    class Config:
        from_attributes = True


class AgentExecutionCreated(BaseModel):
    execution_id: str
    status: AgentExecutionStatus
