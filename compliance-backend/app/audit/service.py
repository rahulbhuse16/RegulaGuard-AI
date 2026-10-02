import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_monitoring import AuditEvent


async def record_audit_event(
    db: AsyncSession,
    organization_id: uuid.UUID,
    event_type: str,
    actor_user_id: Optional[uuid.UUID] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
    description: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditEvent:
    """
    Appends an immutable audit record. There is intentionally no update/delete
    counterpart exposed anywhere in the API layer.
    """
    event = AuditEvent(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        metadata_json=metadata or {},
        ip_address=ip_address,
    )
    db.add(event)
    await db.flush()
    return event
