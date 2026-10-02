import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit_event
from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.ingestion.pipeline import IngestionValidationError, ingest_document, validate_upload
from app.models.documents import Document
from app.models.enums import DocumentType
from app.schemas.common import Page
from app.schemas.document import DocumentOut
from app.services.storage_service import generate_storage_key, save_file
from app.utils.pagination import paginate

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    regulator_id: str | None = Form(default=None),
    jurisdiction_id: str | None = Form(default=None),
    regulation_version_id: str | None = Form(default=None),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    try:
        validate_upload(file.filename or "upload", file.content_type or "application/octet-stream", len(content))
    except IngestionValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    storage_key = generate_storage_key(file.filename or "upload")
    save_file(storage_key, content)

    document = Document(
        organization_id=uuid.UUID(user.org_id),
        original_filename=(file.filename or "upload")[:512],
        storage_key=storage_key,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        document_type=document_type,
        regulator_id=regulator_id,
        jurisdiction_id=jurisdiction_id,
        regulation_version_id=regulation_version_id,
        uploaded_by_id=uuid.UUID(user.id),
    )
    db.add(document)
    await db.flush()

    await record_audit_event(
        db,
        organization_id=document.organization_id,
        event_type="DOCUMENT_UPLOADED",
        actor_user_id=document.uploaded_by_id,
        entity_type="Document",
        entity_id=document.id,
        metadata={"filename": document.original_filename, "document_type": document_type.value},
    )

    # Ingestion runs synchronously in this reference implementation for
    # demo simplicity. For production scale this should be dispatched to a
    # background worker/job queue and the endpoint should return immediately
    # with status=UPLOADED, letting the client poll GET /documents/{id}.
    try:
        await ingest_document(db, document, content)
    except Exception:
        # Failure state already persisted by ingest_document; surface a 500
        # rather than silently returning a partially-processed document.
        await db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Document ingestion failed")

    await db.commit()
    return document


@router.get("", response_model=Page[DocumentOut])
async def list_documents(
    page: int = 1,
    page_size: int = 20,
    document_type: DocumentType | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.organization_id == uuid.UUID(user.org_id))
    if document_type:
        stmt = stmt.where(Document.document_type == document_type)
    return await paginate(db, stmt.order_by(Document.created_at.desc()), DocumentOut, page, page_size)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document = await db.get(Document, document_id)
    if document is None or str(document.organization_id) != user.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document
