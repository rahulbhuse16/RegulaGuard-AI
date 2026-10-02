from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit_event
from app.core.security import CurrentUser, Role, require_roles
from app.db.session import get_db
from app.models.regulatory import Jurisdiction, Regulation, RegulationVersion, Regulator
from app.schemas.common import Page
from app.schemas.regulatory import (
    JurisdictionCreate,
    JurisdictionOut,
    RegulationCreate,
    RegulationOut,
    RegulationVersionCreate,
    RegulationVersionOut,
    RegulatorCreate,
    RegulatorOut,
)
from app.utils.pagination import paginate

router = APIRouter(tags=["regulations"])

write_roles = require_roles(Role.COMPLIANCE_MANAGER, Role.ADMIN)


# --- Regulators ---
@router.post("/regulators", response_model=RegulatorOut, status_code=status.HTTP_201_CREATED)
async def create_regulator(payload: RegulatorCreate, user: CurrentUser = Depends(write_roles), db: AsyncSession = Depends(get_db)):
    regulator = Regulator(**payload.model_dump())
    db.add(regulator)
    await db.flush()
    await record_audit_event(db, organization_id=org_uuid(user), event_type="REGULATOR_CREATED", actor_user_id=uid(user), entity_type="Regulator", entity_id=regulator.id)
    await db.commit()
    return regulator


@router.get("/regulators", response_model=Page[RegulatorOut])
async def list_regulators(page: int = 1, page_size: int = 20, db: AsyncSession = Depends(get_db)):
    return await paginate(db, select(Regulator).order_by(Regulator.name), RegulatorOut, page, page_size)


# --- Jurisdictions ---
@router.post("/jurisdictions", response_model=JurisdictionOut, status_code=status.HTTP_201_CREATED)
async def create_jurisdiction(payload: JurisdictionCreate, user: CurrentUser = Depends(write_roles), db: AsyncSession = Depends(get_db)):
    jurisdiction = Jurisdiction(**payload.model_dump())
    db.add(jurisdiction)
    await db.flush()
    await db.commit()
    return jurisdiction


@router.get("/jurisdictions", response_model=Page[JurisdictionOut])
async def list_jurisdictions(page: int = 1, page_size: int = 20, db: AsyncSession = Depends(get_db)):
    return await paginate(db, select(Jurisdiction).order_by(Jurisdiction.name), JurisdictionOut, page, page_size)


# --- Regulations ---
@router.post("/regulations", response_model=RegulationOut, status_code=status.HTTP_201_CREATED)
async def create_regulation(payload: RegulationCreate, user: CurrentUser = Depends(write_roles), db: AsyncSession = Depends(get_db)):
    regulation = Regulation(**payload.model_dump())
    db.add(regulation)
    await db.flush()
    await record_audit_event(db, organization_id=org_uuid(user), event_type="REGULATION_CREATED", actor_user_id=uid(user), entity_type="Regulation", entity_id=regulation.id)
    await db.commit()
    return regulation


@router.get("/regulations", response_model=Page[RegulationOut])
async def list_regulations(
    page: int = 1,
    page_size: int = 20,
    regulator_id: str | None = Query(default=None),
    jurisdiction_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Regulation)
    if regulator_id:
        stmt = stmt.where(Regulation.regulator_id == regulator_id)
    if jurisdiction_id:
        stmt = stmt.where(Regulation.jurisdiction_id == jurisdiction_id)
    return await paginate(db, stmt.order_by(Regulation.title), RegulationOut, page, page_size)


@router.get("/regulations/{regulation_id}", response_model=RegulationOut)
async def get_regulation(regulation_id: str, db: AsyncSession = Depends(get_db)):
    regulation = await db.get(Regulation, regulation_id)
    if regulation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    return regulation


# --- Regulation Versions ---
@router.post("/regulation-versions", response_model=RegulationVersionOut, status_code=status.HTTP_201_CREATED)
async def create_regulation_version(
    payload: RegulationVersionCreate, user: CurrentUser = Depends(write_roles), db: AsyncSession = Depends(get_db)
):
    if payload.is_current:
        # Only one version may be marked current at a time.
        existing = await db.execute(
            select(RegulationVersion).where(
                RegulationVersion.regulation_id == payload.regulation_id, RegulationVersion.is_current.is_(True)
            )
        )
        for v in existing.scalars().all():
            v.is_current = False

    version = RegulationVersion(**payload.model_dump())
    db.add(version)
    await db.flush()
    await record_audit_event(
        db, organization_id=org_uuid(user), event_type="REGULATION_VERSION_CREATED", actor_user_id=uid(user),
        entity_type="RegulationVersion", entity_id=version.id,
    )
    await db.commit()
    return version


@router.get("/regulation-versions", response_model=Page[RegulationVersionOut])
async def list_regulation_versions(
    regulation_id: str | None = Query(default=None), page: int = 1, page_size: int = 20, db: AsyncSession = Depends(get_db)
):
    stmt = select(RegulationVersion)
    if regulation_id:
        stmt = stmt.where(RegulationVersion.regulation_id == regulation_id)
    return await paginate(db, stmt.order_by(RegulationVersion.publication_date), RegulationVersionOut, page, page_size)


# --- helpers ---
def uid(user: CurrentUser):
    import uuid

    return uuid.UUID(user.id)


def org_uuid(user: CurrentUser):
    import uuid

    return uuid.UUID(user.org_id)
