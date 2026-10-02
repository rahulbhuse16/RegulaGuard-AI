import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, Role, require_roles
from app.db.session import get_db
from app.models.audit_monitoring import AuditEvent
from app.schemas.common import Page
from app.utils.pagination import paginate

router = APIRouter(prefix="/audit", tags=["audit"])

auditor_roles = require_roles(Role.AUDITOR, Role.COMPLIANCE_MANAGER, Role.ADMIN)


class AuditEventOut(BaseModel):
    id: str
    event_type: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    description: Optional[str]
    actor_user_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=Page[AuditEventOut])
async def list_audit_events(
    event_type: str | None = None,
    entity_type: str | None = None,
    page: int = 1,
    page_size: int = 50,
    user: CurrentUser = Depends(auditor_roles),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditEvent).where(AuditEvent.organization_id == uuid.UUID(user.org_id))
    if event_type:
        stmt = stmt.where(AuditEvent.event_type == event_type)
    if entity_type:
        stmt = stmt.where(AuditEvent.entity_type == entity_type)
    return await paginate(db, stmt.order_by(AuditEvent.created_at.desc()), AuditEventOut, page, page_size)
