import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit_event
from app.core.logging import get_logger
from app.core.security import CurrentUser, Role, require_roles
from app.db.session import get_db
from app.models.audit_monitoring import MonitoringJob
from app.models.enums import MonitoringJobStatus

router = APIRouter(prefix="/monitoring", tags=["monitoring"])
logger = get_logger(__name__)

trigger_roles = require_roles(Role.COMPLIANCE_MANAGER, Role.ADMIN)


class ManualTriggerRequest(BaseModel):
    source_name: str = "demo-manual-trigger"


@router.post("/trigger", status_code=202)
async def trigger_monitoring(
    payload: ManualTriggerRequest, user: CurrentUser = Depends(trigger_roles), db: AsyncSession = Depends(get_db)
):
    """
    Manually runs a monitoring cycle so judges/demos don't have to wait for a
    schedule. In this reference implementation the "check for new sources"
    step is a stub that reports zero new documents; wire in a real source
    connector here later. New-document/version detection and downstream
    change-detection + impact-analysis triggering are left as the extension
    points -- see README "Next steps".
    """
    job = MonitoringJob(
        organization_id=uuid.UUID(user.org_id),
        source_name=payload.source_name,
        status=MonitoringJobStatus.RUNNING,
        triggered_manually=True,
        started_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.flush()

    # Placeholder monitoring cycle: real implementation would poll configured
    # regulatory source connectors here.
    job.new_documents_found = 0
    job.changes_detected = 0
    job.status = MonitoringJobStatus.COMPLETED
    job.completed_at = datetime.now(timezone.utc)
    job.result_summary = "Manual demo trigger completed. No source connectors configured yet."
    await db.flush()

    await record_audit_event(
        db, organization_id=uuid.UUID(user.org_id), event_type="MONITORING_EXECUTED",
        actor_user_id=uuid.UUID(user.id), entity_type="MonitoringJob", entity_id=job.id,
    )
    await db.commit()

    return {
        "job_id": str(job.id),
        "status": job.status.value,
        "new_documents_found": job.new_documents_found,
        "changes_detected": job.changes_detected,
        "result_summary": job.result_summary,
    }


@router.get("/jobs")
async def list_monitoring_jobs(user: CurrentUser = Depends(require_roles(Role.COMPLIANCE_MANAGER, Role.ADMIN, Role.AUDITOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MonitoringJob).where(MonitoringJob.organization_id == uuid.UUID(user.org_id)).order_by(MonitoringJob.started_at.desc())
    )
    jobs = result.scalars().all()
    return [
        {
            "id": str(j.id),
            "source_name": j.source_name,
            "status": j.status.value,
            "triggered_manually": j.triggered_manually,
            "started_at": j.started_at,
            "completed_at": j.completed_at,
            "new_documents_found": j.new_documents_found,
            "changes_detected": j.changes_detected,
            "result_summary": j.result_summary,
        }
        for j in jobs
    ]
