import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.obligation_extraction import run_obligation_extraction
from app.audit.service import record_audit_event
from app.core.security import CurrentUser, Role, get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import ReviewStatus
from app.models.regulatory import RegulatoryObligation
from app.schemas.common import Page
from app.schemas.obligation import ExtractObligationsRequest, ObligationOut, ObligationReviewRequest
from app.utils.pagination import paginate

router = APIRouter(prefix="/obligations", tags=["obligations"])

reviewer_roles = require_roles(Role.COMPLIANCE_MANAGER, Role.ADMIN, Role.COMPLIANCE_ANALYST)


@router.post("/extract", status_code=status.HTTP_202_ACCEPTED)
async def extract_obligations(
    payload: ExtractObligationsRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Runs the Obligation Extraction Agent synchronously for demo simplicity and
    returns the resulting AgentExecution id. Idempotent: re-calling with the
    same regulation_version_id while a prior run exists returns the same
    execution rather than duplicating obligations.
    """
    try:
        result = await run_obligation_extraction(
            db,
            organization_id=uuid.UUID(user.org_id),
            regulation_version_id=uuid.UUID(payload.regulation_version_id),
            requested_by_id=uuid.UUID(user.id),
        )
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Obligation extraction failed") from exc

    await record_audit_event(
        db,
        organization_id=uuid.UUID(user.org_id),
        event_type="OBLIGATION_EXTRACTION_RUN",
        actor_user_id=uuid.UUID(user.id),
        metadata=result,
    )
    await db.commit()
    return result


@router.get("", response_model=Page[ObligationOut])
async def list_obligations(
    regulation_version_id: str | None = None,
    review_status: ReviewStatus | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RegulatoryObligation)
    if regulation_version_id:
        stmt = stmt.where(RegulatoryObligation.regulation_version_id == regulation_version_id)
    if review_status:
        stmt = stmt.where(RegulatoryObligation.review_status == review_status)
    return await paginate(db, stmt.order_by(RegulatoryObligation.created_at.desc()), ObligationOut, page, page_size)


@router.post("/{obligation_id}/approve", response_model=ObligationOut)
async def approve_obligation(
    obligation_id: str,
    payload: ObligationReviewRequest,
    user: CurrentUser = Depends(reviewer_roles),
    db: AsyncSession = Depends(get_db),
):
    obligation = await _get_obligation_or_404(db, obligation_id)
    obligation.review_status = ReviewStatus.APPROVED
    obligation.reviewed_by_id = uuid.UUID(user.id)
    obligation.review_notes = payload.notes
    await db.flush()
    await record_audit_event(
        db, organization_id=uuid.UUID(user.org_id), event_type="OBLIGATION_APPROVED",
        actor_user_id=uuid.UUID(user.id), entity_type="RegulatoryObligation", entity_id=obligation.id,
    )
    await db.commit()
    return obligation


@router.post("/{obligation_id}/reject", response_model=ObligationOut)
async def reject_obligation(
    obligation_id: str,
    payload: ObligationReviewRequest,
    user: CurrentUser = Depends(reviewer_roles),
    db: AsyncSession = Depends(get_db),
):
    obligation = await _get_obligation_or_404(db, obligation_id)
    obligation.review_status = ReviewStatus.REJECTED
    obligation.reviewed_by_id = uuid.UUID(user.id)
    obligation.review_notes = payload.notes
    await db.flush()
    await record_audit_event(
        db, organization_id=uuid.UUID(user.org_id), event_type="OBLIGATION_REJECTED",
        actor_user_id=uuid.UUID(user.id), entity_type="RegulatoryObligation", entity_id=obligation.id,
    )
    await db.commit()
    return obligation


@router.post("/{obligation_id}/modify", response_model=ObligationOut)
async def modify_obligation(
    obligation_id: str,
    payload: ObligationReviewRequest,
    user: CurrentUser = Depends(reviewer_roles),
    db: AsyncSession = Depends(get_db),
):
    if not payload.modified_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="modified_text is required")
    obligation = await _get_obligation_or_404(db, obligation_id)
    obligation.obligation_text = payload.modified_text
    obligation.review_status = ReviewStatus.MODIFIED
    obligation.reviewed_by_id = uuid.UUID(user.id)
    obligation.review_notes = payload.notes
    await db.flush()
    await record_audit_event(
        db, organization_id=uuid.UUID(user.org_id), event_type="OBLIGATION_MODIFIED",
        actor_user_id=uuid.UUID(user.id), entity_type="RegulatoryObligation", entity_id=obligation.id,
    )
    await db.commit()
    return obligation


async def _get_obligation_or_404(db: AsyncSession, obligation_id: str) -> RegulatoryObligation:
    obligation = await db.get(RegulatoryObligation, obligation_id)
    if obligation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")
    return obligation
