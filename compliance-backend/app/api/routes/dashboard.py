import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.assessment import ComplianceGap, RiskAssessment
from app.models.analysis import Contradiction
from app.models.controls import Control, ControlAssessment
from app.models.documents import Document
from app.models.evidence import Evidence
from app.models.regulatory import Regulation, RegulatoryChange, RegulatoryObligation
from app.models.remediation import Remediation, RemediationTask
from app.models.audit_monitoring import MonitoringJob
from app.models.enums import ControlEffectiveness, GapCategory, MonitoringJobStatus, RemediationTaskStatus, ReviewStatus, RiskPriority

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _count(db: AsyncSession, stmt) -> int:
    result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    return result.scalar_one()


@router.get("")
async def get_dashboard(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org_id = uuid.UUID(user.org_id)

    regulation_count = await _count(db, select(Regulation.id))

    total_obligations = await _count(db, select(RegulatoryObligation.id))
    mapped_obligations = await _count(
        db,
        select(RegulatoryObligation.id).where(RegulatoryObligation.review_status == ReviewStatus.APPROVED),
    )

    control_count = await _count(db, select(Control.id).where(Control.organization_id == org_id))

    effectiveness_rows = await db.execute(
        select(ControlAssessment.effectiveness, func.count()).group_by(ControlAssessment.effectiveness)
    )
    control_effectiveness = {row[0].value: row[1] for row in effectiveness_rows.all()}

    evidence_count = await _count(db, select(Evidence.id))

    gap_rows = await db.execute(select(ComplianceGap.category, func.count()).group_by(ComplianceGap.category))
    gap_counts = {row[0].value: row[1] for row in gap_rows.all()}
    open_gap_count = await _count(db, select(ComplianceGap.id).where(ComplianceGap.is_open.is_(True)))

    risk_rows = await db.execute(select(RiskAssessment.priority, func.count()).group_by(RiskAssessment.priority))
    risk_distribution = {row[0].value: row[1] for row in risk_rows.all()}

    remediation_task_rows = await db.execute(
        select(RemediationTask.status, func.count()).group_by(RemediationTask.status)
    )
    remediation_status = {row[0].value: row[1] for row in remediation_task_rows.all()}
    remediation_count = await _count(db, select(Remediation.id))

    change_count = await _count(db, select(RegulatoryChange.id))
    contradiction_count = await _count(db, select(Contradiction.id))

    monitoring_rows = await db.execute(
        select(MonitoringJob.status, func.count())
        .where(MonitoringJob.organization_id == org_id)
        .group_by(MonitoringJob.status)
    )
    monitoring_status = {row[0].value: row[1] for row in monitoring_rows.all()}

    return {
        "regulation_count": regulation_count,
        "obligations": {
            "total": total_obligations,
            "approved": mapped_obligations,
            "unmapped_or_pending": total_obligations - mapped_obligations,
        },
        "control_count": control_count,
        "control_effectiveness": control_effectiveness,
        "evidence_count": evidence_count,
        "gaps": {"total": len(gap_counts) and sum(gap_counts.values()) or 0, "open": open_gap_count, "by_category": gap_counts},
        "risk_distribution": risk_distribution,
        "remediation": {"total": remediation_count, "tasks_by_status": remediation_status},
        "regulatory_changes": change_count,
        "contradictions": contradiction_count,
        "monitoring_status": monitoring_status,
    }
