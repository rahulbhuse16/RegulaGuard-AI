"""
Deterministic risk scoring model for compliance gaps.

The LLM is NEVER asked to invent a risk number. All seven input dimensions
are 0-10 scores supplied by an analyst or derived from rule-based signals
(e.g. gap category, control criticality, evidence recency) in the calling
service. This module only implements the documented, versioned formula.

MODEL VERSION: risk_model_v1

Formula
-------
impact  = 0.30 * regulatory_impact
        + 0.20 * customer_impact
        + 0.20 * financial_impact
        + 0.10 * business_impact
                                        (impact subtotal weights sum to 0.80)

risk_score = impact
           + 0.10 * likelihood
           + 0.05 * severity
           + 0.05 * urgency
                                        (remaining weights sum to 0.20)

All seven inputs are expected on a 0-10 scale; risk_score is therefore
bounded to 0-10.

Priority bands (documented, configurable via RISK_BANDS):
    score >= 8.0            -> CRITICAL
    6.0 <= score < 8.0       -> HIGH
    3.5 <= score < 6.0       -> MEDIUM
    score < 3.5              -> LOW
"""
from dataclasses import dataclass

from app.models.enums import RiskPriority

MODEL_VERSION = "risk_model_v1"

WEIGHTS = {
    "regulatory_impact": 0.30,
    "customer_impact": 0.20,
    "financial_impact": 0.20,
    "business_impact": 0.10,
    "likelihood": 0.10,
    "severity": 0.05,
    "urgency": 0.05,
}

RISK_BANDS = (
    (8.0, RiskPriority.CRITICAL),
    (6.0, RiskPriority.HIGH),
    (3.5, RiskPriority.MEDIUM),
    (0.0, RiskPriority.LOW),
)


@dataclass
class RiskInputs:
    regulatory_impact: float
    customer_impact: float
    financial_impact: float
    business_impact: float
    likelihood: float
    severity: float
    urgency: float

    def validate(self) -> None:
        for name, value in self.__dict__.items():
            if not (0.0 <= value <= 10.0):
                raise ValueError(f"Risk input '{name}' must be between 0 and 10, got {value}")


@dataclass
class RiskResult:
    score: float
    priority: RiskPriority
    rationale: str
    model_version: str = MODEL_VERSION


def calculate_risk(inputs: RiskInputs) -> RiskResult:
    inputs.validate()

    score = sum(getattr(inputs, factor) * weight for factor, weight in WEIGHTS.items())
    score = round(score, 2)

    priority = RiskPriority.LOW
    for threshold, band in RISK_BANDS:
        if score >= threshold:
            priority = band
            break

    contributions = ", ".join(
        f"{factor}={getattr(inputs, factor):.1f}×{weight:.2f}" for factor, weight in WEIGHTS.items()
    )
    rationale = (
        f"[{MODEL_VERSION}] score={score:.2f} → {priority.value}. "
        f"Weighted contributions: {contributions}."
    )
    return RiskResult(score=score, priority=priority, rationale=rationale)
