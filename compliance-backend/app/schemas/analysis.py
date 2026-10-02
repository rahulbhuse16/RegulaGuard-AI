from datetime import date
from typing import Optional

from pydantic import BaseModel


class ImpactAnalysisRequest(BaseModel):
    regulatory_change_id: str


class SimulationRequest(BaseModel):
    regulation_id: Optional[str] = None
    product_id: Optional[str] = None
    jurisdiction_id: Optional[str] = None
    business_unit_id: Optional[str] = None
    hypothetical_effective_date: Optional[date] = None
    assumptions: Optional[str] = None


class CrossRegulationRequest(BaseModel):
    regulation_a_id: str
    regulation_b_id: str


class ContradictionDetectionRequest(BaseModel):
    obligation_a_id: str
    obligation_b_id: str


class ContradictionReviewRequest(BaseModel):
    notes: Optional[str] = None
