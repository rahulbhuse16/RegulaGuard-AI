import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.contradiction_detection import run_contradiction_detection
from app.agents.cross_regulation import run_cross_regulation_comparison
from app.analysis.simulation import run_simulation
from app.audit.service import record_audit_event
from app.core.security import CurrentUser, Role, get_current_user, require_roles
from app.db.session import get_db
from app.models.analysis import Contradiction, CrossRegulationFinding, Simulation
from app.models.enums import ContradictionReviewStatus
from app.schemas.analysis import (
    ContradictionDetectionRequest,
    ContradictionReviewRequest,
    CrossRegulationRequest,
    ImpactAnalysisRequest,
    SimulationRequest,
)
from app.workflows.impact_analysis import run_impact_analysis

router = APIRouter(tags=["analysis"])
reviewer_roles = require_roles(Role.COMPLIANCE_MANAGER, Role.ADMIN, Role.COMPLIANCE_ANALYST)


async def _run_or_500(db, coro):
    try:
        return await coro
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Analysis workflow failed") from exc


# --- Impact Analysis (Feature 11) ---
@router.post("/impact-analysis", status_code=status.HTTP_202_ACCEPTED)
async def start_impact_analysis(
    payload: ImpactAnalysisRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Runs the full autonomous impact-analysis workflow synchronously for demo
    simplicity and returns {execution_id, status, ...report}. In production
    this should be dispatched to a background worker immediately, returning
    {execution_id, status: QUEUED}, with progress polled via
    GET /agent-executions/{execution_id}.
    """
    result = await _run_or_500(
        db,
        run_impact_analysis(db, uuid.UUID(user.org_id), uuid.UUID(payload.regulatory_change_id), uuid.UUID(user.id)),
    )
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="IMPACT_ANALYSIS_RUN", actor_user_id=uuid.UUID(user.id), metadata=result)
    await db.commit()
    return result


# --- Simulations (Feature 12) ---
@router.post("/simulations", status_code=status.HTTP_201_CREATED)
async def create_simulation(
    payload: SimulationRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await run_simulation(
        db,
        uuid.UUID(user.org_id),
        uuid.UUID(user.id),
        uuid.UUID(payload.regulation_id) if payload.regulation_id else None,
        uuid.UUID(payload.product_id) if payload.product_id else None,
        uuid.UUID(payload.jurisdiction_id) if payload.jurisdiction_id else None,
        uuid.UUID(payload.business_unit_id) if payload.business_unit_id else None,
        payload.hypothetical_effective_date,
        payload.assumptions,
    )
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="SIMULATION_RUN", actor_user_id=uuid.UUID(user.id), metadata={"simulation_id": result["simulation_id"]})
    await db.commit()
    return result


@router.get("/simulations")
async def list_simulations(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Simulation).where(Simulation.organization_id == uuid.UUID(user.org_id)).order_by(Simulation.created_at.desc())
    )
    rows = result.scalars().all()
    return [{"id": str(r.id), "result": r.result_json, "created_at": r.created_at} for r in rows]


# --- Cross-Regulation Intelligence (Feature 13) ---
@router.post("/cross-regulation/compare", status_code=status.HTTP_202_ACCEPTED)
async def compare_regulations(
    payload: CrossRegulationRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await _run_or_500(
        db,
        run_cross_regulation_comparison(
            db, uuid.UUID(user.org_id), uuid.UUID(payload.regulation_a_id), uuid.UUID(payload.regulation_b_id), uuid.UUID(user.id)
        ),
    )
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="CROSS_REGULATION_COMPARED", actor_user_id=uuid.UUID(user.id), metadata=result)
    await db.commit()
    return result


@router.get("/cross-regulation/findings")
async def list_cross_regulation_findings(
    regulation_a_id: str | None = None, regulation_b_id: str | None = None, db: AsyncSession = Depends(get_db)
):
    stmt = select(CrossRegulationFinding)
    if regulation_a_id:
        stmt = stmt.where(CrossRegulationFinding.regulation_a_id == regulation_a_id)
    if regulation_b_id:
        stmt = stmt.where(CrossRegulationFinding.regulation_b_id == regulation_b_id)
    result = await db.execute(stmt.order_by(CrossRegulationFinding.created_at.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id), "finding_type": r.finding_type, "explanation": r.explanation, "confidence": r.confidence,
            "obligation_a_id": str(r.obligation_a_id) if r.obligation_a_id else None,
            "obligation_b_id": str(r.obligation_b_id) if r.obligation_b_id else None,
        }
        for r in rows
    ]


# --- Contradiction Detection (Feature 14) ---
@router.post("/contradictions/detect", status_code=status.HTTP_202_ACCEPTED)
async def detect_contradiction(
    payload: ContradictionDetectionRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await _run_or_500(
        db,
        run_contradiction_detection(
            db, uuid.UUID(user.org_id), uuid.UUID(payload.obligation_a_id), uuid.UUID(payload.obligation_b_id), uuid.UUID(user.id)
        ),
    )
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="CONTRADICTION_DETECTION_RUN", actor_user_id=uuid.UUID(user.id), metadata=result)
    await db.commit()
    return result


@router.get("/contradictions")
async def list_contradictions(review_status: ContradictionReviewStatus | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Contradiction)
    if review_status:
        stmt = stmt.where(Contradiction.review_status == review_status)
    result = await db.execute(stmt.order_by(Contradiction.created_at.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id), "obligation_a_id": str(r.obligation_a_id), "obligation_b_id": str(r.obligation_b_id),
            "contradiction_type": r.contradiction_type.value, "explanation": r.explanation, "conditions": r.conditions,
            "confidence": r.confidence, "review_status": r.review_status.value,
        }
        for r in rows
    ]


@router.post("/contradictions/{contradiction_id}/confirm")
async def confirm_contradiction(
    contradiction_id: str, payload: ContradictionReviewRequest, user: CurrentUser = Depends(reviewer_roles), db: AsyncSession = Depends(get_db)
):
    contradiction = await db.get(Contradiction, contradiction_id)
    if contradiction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contradiction not found")
    contradiction.review_status = ContradictionReviewStatus.CONFIRMED
    contradiction.reviewed_by_id = uuid.UUID(user.id)
    await db.flush()
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="CONTRADICTION_CONFIRMED", actor_user_id=uuid.UUID(user.id), entity_type="Contradiction", entity_id=contradiction.id)
    await db.commit()
    return {"id": str(contradiction.id), "review_status": contradiction.review_status.value}


@router.post("/contradictions/{contradiction_id}/reject")
async def reject_contradiction(
    contradiction_id: str, payload: ContradictionReviewRequest, user: CurrentUser = Depends(reviewer_roles), db: AsyncSession = Depends(get_db)
):
    contradiction = await db.get(Contradiction, contradiction_id)
    if contradiction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contradiction not found")
    contradiction.review_status = ContradictionReviewStatus.REJECTED
    contradiction.reviewed_by_id = uuid.UUID(user.id)
    await db.flush()
    await record_audit_event(db, organization_id=uuid.UUID(user.org_id), event_type="CONTRADICTION_REJECTED", actor_user_id=uuid.UUID(user.id), entity_type="Contradiction", entity_id=contradiction.id)
    await db.commit()
    return {"id": str(contradiction.id), "review_status": contradiction.review_status.value}
