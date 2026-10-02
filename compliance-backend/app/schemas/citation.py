from typing import Optional

from pydantic import BaseModel, Field


class SourceCitationOut(BaseModel):
    id: str
    document_id: Optional[str] = None
    document_chunk_id: Optional[str] = None
    page_number: Optional[int] = None
    section: Optional[str] = None
    source_text: Optional[str] = None
    relevance: Optional[float] = Field(default=None, ge=0, le=1)
    extraction_confidence: Optional[float] = Field(default=None, ge=0, le=1)

    class Config:
        from_attributes = True
