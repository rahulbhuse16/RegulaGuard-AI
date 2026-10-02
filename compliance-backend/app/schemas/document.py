from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.models.enums import DocumentStatus, DocumentType


class DocumentOut(BaseModel):
    id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    document_type: DocumentType
    status: DocumentStatus
    failure_reason: Optional[str]
    regulator_id: Optional[str]
    jurisdiction_id: Optional[str]
    regulation_version_id: Optional[str]
    publication_date: Optional[date]
    effective_date: Optional[date]

    class Config:
        from_attributes = True


class DocumentUploadMetadata(BaseModel):
    document_type: DocumentType
    regulator_id: Optional[str] = None
    jurisdiction_id: Optional[str] = None
    regulation_version_id: Optional[str] = None
    publication_date: Optional[date] = None
    effective_date: Optional[date] = None
