from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.enums import ReviewStatus


class ExtractedObligation(BaseModel):
    """
    Structured output the LLM MUST produce for each obligation it identifies
    in a chunk of regulatory text. Never persisted until validated against
    this schema (see llm_service.get_structured_response).
    """

    obligation_text: str = Field(..., min_length=10, description="Verbatim or closely paraphrased obligation text")
    requirement_type: Optional[str] = Field(None, description="e.g. reporting, disclosure, capital, conduct, data-protection")
    responsible_function: Optional[str] = Field(None, description="e.g. Compliance, Risk, Operations")
    effective_date_hint: Optional[str] = Field(None, description="Any effective date mentioned in the text, ISO format if possible")
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_text: str = Field(..., description="The exact excerpt supporting this obligation")


class ExtractedObligationList(BaseModel):
    obligations: List[ExtractedObligation]


class ObligationOut(BaseModel):
    id: str
    regulation_version_id: str
    obligation_text: str
    requirement_type: Optional[str]
    responsible_function: Optional[str]
    effective_date: Optional[date]
    confidence: Optional[float]
    review_status: ReviewStatus

    class Config:
        from_attributes = True


class ObligationReviewRequest(BaseModel):
    notes: Optional[str] = None
    modified_text: Optional[str] = Field(None, description="Required when review results in MODIFIED status")


class ExtractObligationsRequest(BaseModel):
    regulation_version_id: str
