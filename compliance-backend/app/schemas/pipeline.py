from typing import Optional

from pydantic import BaseModel


class ControlMappingRequest(BaseModel):
    obligation_id: str
    candidate_control_ids: Optional[list[str]] = None


class ControlAssessmentRequest(BaseModel):
    control_id: str


class EvidenceAssessmentRequest(BaseModel):
    evidence_id: str
    obligation_text: str
    control_name: str


class GapAnalysisRequest(BaseModel):
    obligation_id: str


class RiskAssessmentRequest(BaseModel):
    gap_id: str
    overrides: Optional[dict] = None


class RemediationRequest(BaseModel):
    gap_id: str


class ReviewDecisionRequest(BaseModel):
    notes: Optional[str] = None
