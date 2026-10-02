import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.control_assessment import run_control_assessment
from app.agents.control_mapping import run_control_mapping
from app.agents.evidence_assessment import run_evidence_assessment
from app.agents.gap_analysis import run_gap_analysis
from app.agents.remediation import run_remediation_generation
from app.agents.risk_assessment import run_risk_assessment
from app.audit.service import record_audit_event
from app.core.security import CurrentUser, Role, get_current_user, require_roles
from app.db.session import get_db
from app.models.assessment import ComplianceGap, RiskAssessment
from app.models.controls import ControlAssessment, ControlMapping
from app.models.enums import RemediationProvenance, ReviewStatus
from app.models.evidence import EvidenceAssessment
from app.models.remediation import Remediation
from app.schemas.pipeline import (
    ControlAssessmentRequest,
    ControlMappingRequest,
    EvidenceAssessmentRequest,
    GapAnalysisRequest,
    RemediationRequest,
    ReviewDecisionRequest,
    RiskAssessmentRequest,
)

router = APIRouter(tags=["compliance-pipeline"])
reviewer_roles = require_roles(Role.COMPLIANCE_MANAGER, Role.ADMIN, Role.COMPLIANCE_ANALYST)


async def _run_agent_endpoint(db, coro, org_id, user_id, audit_event_type):
    try:
        result = await coro
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Agent execution failed") from exc

    await record_audit_event(db, organization_id=org_id, event_type=audit_event_type, actor_user_id=user_id, metadata=result)
    await db.commit()
    return result


# --- Control Mappings (Feature 5) ---
@router.post("/control-mappings/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_control_mappings(
    payload: ControlMappingRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    candidate_ids = [uuid.UUID(c) for c in payload.candidate_control_ids] if payload.candidate_control_ids else None
    return await _run_agent_endpoint(
        db,
        run_control_mapping(db, uuid.UUID(user.org_id), uuid.UUID(payload.obligation_id), uuid.UUID(user.id), candidate_ids),
        uuid.UUID(user.org_id), uuid.UUID(user.id), "CONTROL_MAPPING_RUN",
    )


@router.get("/control-mappings")
async def list_control_mappings(obligation_id: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(ControlMapping)
    if obligation_id:
        stmt = stmt.where(ControlMapping.obligation_id == obligation_id)
    result = await db.execute(stmt.order_by(ControlMapping.created_at.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id), "obligation_id": str(r.obligation_id), "control_id": str(r.control_id),
            "status": r.status.value, "confidence": r.confidence, "rationale": r.rationale,
            "review_status": r.review_status.value,
        }
        for r in rows
    ]


@router.post("/control-mappings/{mapping_id}/approve")
async def approve_control_mapping(
    mapping_id: str, payload: ReviewDecisionRequest, user: CurrentUser = Depends(reviewer_roles), db: AsyncSession = Depends(get_db)
):
    mapping = await db.get(ControlMapping, mapping_id)
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Control mapping not found")
    mapping.review_status = ReviewStatus.APPROVED
    mapping.reviewed_by_id = uuid.UUID(user.id)
    await db.flush()
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="CONTROL_MAPPING_APPROVED", actor_user_id=uuid.UUID(user.id), entity_type="ControlMapping", entity_id=mapping.id)
    await db.commit()
    return {"id": str(mapping.id), "review_status": mapping.review_status.value}


@router.post("/control-mappings/{mapping_id}/reject")
async def reject_control_mapping(
    mapping_id: str, payload: ReviewDecisionRequest, user: CurrentUser = Depends(reviewer_roles), db: AsyncSession = Depends(get_db)
):
    mapping = await db.get(ControlMapping, mapping_id)
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Control mapping not found")
    mapping.review_status = ReviewStatus.REJECTED
    mapping.reviewed_by_id = uuid.UUID(user.id)
    await db.flush()
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="CONTROL_MAPPING_REJECTED", actor_user_id=uuid.UUID(user.id), entity_type="ControlMapping", entity_id=mapping.id)
    await db.commit()
    return {"id": str(mapping.id), "review_status": mapping.review_status.value}


# --- Control Assessments (Feature 6) ---
@router.post("/control-assessments/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_control_assessment(
    payload: ControlAssessmentRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await _run_agent_endpoint(
        db,
        run_control_assessment(db, uuid.UUID(user.org_id), uuid.UUID(payload.control_id), uuid.UUID(user.id)),
        uuid.UUID(user.org_id), uuid.UUID(user.id), "CONTROL_ASSESSMENT_RUN",
    )


@router.get("/control-assessments")
async def list_control_assessments(control_id: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(ControlAssessment)
    if control_id:
        stmt = stmt.where(ControlAssessment.control_id == control_id)
    result = await db.execute(stmt.order_by(ControlAssessment.created_at.desc()))
    rows = result.scalars().all()
    return [
        {"id": str(r.id), "control_id": str(r.control_id), "effectiveness": r.effectiveness.value, "reasoning": r.reasoning, "confidence": r.confidence}
        for r in rows
    ]


# --- Evidence Assessments (Feature 7) ---
@router.post("/evidence/assess", status_code=status.HTTP_202_ACCEPTED)
async def assess_evidence(
    payload: EvidenceAssessmentRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await _run_agent_endpoint(
        db,
        run_evidence_assessment(
            db, uuid.UUID(user.org_id), uuid.UUID(payload.evidence_id), payload.obligation_text, payload.control_name, uuid.UUID(user.id)
        ),
        uuid.UUID(user.org_id), uuid.UUID(user.id), "EVIDENCE_ASSESSMENT_RUN",
    )


@router.get("/evidence-assessments")
async def list_evidence_assessments(evidence_id: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(EvidenceAssessment)
    if evidence_id:
        stmt = stmt.where(EvidenceAssessment.evidence_id == evidence_id)
    result = await db.execute(stmt.order_by(EvidenceAssessment.created_at.desc()))
    rows = result.scalars().all()
    return [
        {"id": str(r.id), "evidence_id": str(r.evidence_id), "sufficiency": r.sufficiency.value, "reasoning": r.reasoning, "confidence": r.confidence}
        for r in rows
    ]


# --- Gaps (Feature 8) ---
@router.post("/gaps/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_gaps(
    payload: GapAnalysisRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await _run_agent_endpoint(
        db,
        run_gap_analysis(db, uuid.UUID(user.org_id), uuid.UUID(payload.obligation_id), uuid.UUID(user.id)),
        uuid.UUID(user.org_id), uuid.UUID(user.id), "GAP_ANALYSIS_RUN",
    )


@router.get("/gaps")
async def list_gaps(is_open: bool | None = None, category: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(ComplianceGap)
    if is_open is not None:
        stmt = stmt.where(ComplianceGap.is_open.is_(is_open))
    if category:
        stmt = stmt.where(ComplianceGap.category == category)
    result = await db.execute(stmt.order_by(ComplianceGap.created_at.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id), "obligation_id": str(r.obligation_id) if r.obligation_id else None,
            "control_id": str(r.control_id) if r.control_id else None, "category": r.category.value,
            "description": r.description, "is_open": r.is_open,
        }
        for r in rows
    ]


# --- Risk Assessments (Feature 9) ---
@router.post("/risk-assessments/calculate", status_code=status.HTTP_202_ACCEPTED)
async def calculate_gap_risk(
    payload: RiskAssessmentRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await _run_agent_endpoint(
        db,
        run_risk_assessment(db, uuid.UUID(user.org_id), uuid.UUID(payload.gap_id), uuid.UUID(user.id), payload.overrides),
        uuid.UUID(user.org_id), uuid.UUID(user.id), "RISK_ASSESSMENT_RUN",
    )


@router.get("/risk-assessments")
async def list_risk_assessments(gap_id: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(RiskAssessment)
    if gap_id:
        stmt = stmt.where(RiskAssessment.gap_id == gap_id)
    result = await db.execute(stmt.order_by(RiskAssessment.created_at.desc()))
    rows = result.scalars().all()
    return [
        {"id": str(r.id), "gap_id": str(r.gap_id), "score": r.score, "priority": r.priority.value, "rationale": r.rationale, "model_version": r.model_version}
        for r in rows
    ]


# --- Remediations (Feature 10) ---
@router.post("/remediations/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_remediation(
    payload: RemediationRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await _run_agent_endpoint(
        db,
        run_remediation_generation(db, uuid.UUID(user.org_id), uuid.UUID(payload.gap_id), uuid.UUID(user.id)),
        uuid.UUID(user.org_id), uuid.UUID(user.id), "REMEDIATION_GENERATED",
    )


@router.get("/remediations")
async def list_remediations(gap_id: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Remediation)
    if gap_id:
        stmt = stmt.where(Remediation.gap_id == gap_id)
    result = await db.execute(stmt.order_by(Remediation.created_at.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id), "gap_id": str(r.gap_id), "recommendation": r.recommendation, "owner": r.owner,
            "priority": r.priority.value if r.priority else None, "target_date": r.target_date,
            "provenance": r.provenance.value,
        }
        for r in rows
    ]


@router.post("/remediations/{remediation_id}/approve")
async def approve_remediation(
    remediation_id: str, payload: ReviewDecisionRequest, user: CurrentUser = Depends(reviewer_roles), db: AsyncSession = Depends(get_db)
):
    remediation = await db.get(Remediation, remediation_id)
    if remediation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Remediation not found")
    remediation.provenance = RemediationProvenance.HUMAN_APPROVED
    remediation.reviewed_by_id = uuid.UUID(user.id)
    await db.flush()
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="REMEDIATION_APPROVED", actor_user_id=uuid.UUID(user.id), entity_type="Remediation", entity_id=remediation.id)
    await db.commit()
    return {"id": str(remediation.id), "provenance": remediation.provenance.value}


@router.post("/remediations/{remediation_id}/reject")
async def reject_remediation(
    remediation_id: str, payload: ReviewDecisionRequest, user: CurrentUser = Depends(reviewer_roles), db: AsyncSession = Depends(get_db)
):
    remediation = await db.get(Remediation, remediation_id)
    if remediation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Remediation not found")
    remediation.provenance = RemediationProvenance.HUMAN_REJECTED
    remediation.reviewed_by_id = uuid.UUID(user.id)
    await db.flush()
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="REMEDIATION_REJECTED", actor_user_id=uuid.UUID(user.id), entity_type="Remediation", entity_id=remediation.id)
    await db.commit()
    return {"id": str(remediation.id), "provenance": remediation.provenance.value}
