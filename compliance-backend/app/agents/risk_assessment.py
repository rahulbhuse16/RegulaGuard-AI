"""
Risk Assessment Agent (Feature 9).

The LLM is NEVER used to produce the risk score. Base risk-dimension inputs
are derived deterministically from the gap's category via a documented
lookup table (GAP_CATEGORY_BASE_RISK below); an analyst can override any
input before scoring. The actual scoring formula lives in
app/services/risk_engine.py and is versioned (risk_model_v1).
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import AgentRun
from app.models.assessment import ComplianceGap, RiskAssessment
from app.models.enums import AgentName, GapCategory
from app.services.risk_engine import RiskInputs, calculate_risk

# Documented, versioned base-risk lookup (0-10 scale per dimension).
# regulatory_impact, customer_impact, financial_impact, business_impact,
# likelihood, severity, urgency
GAP_CATEGORY_BASE_RISK: dict[GapCategory, RiskInputs] = {
    GapCategory.OBLIGATION_UNMAPPED: RiskInputs(8, 6, 5, 6, 6, 7, 7),
    GapCategory.CONTROL_MISSING: RiskInputs(8, 7, 6, 6, 7, 7, 7),
    GapCategory.CONTROL_PARTIAL: RiskInputs(6, 5, 4, 5, 5, 5, 5),
    GapCategory.CONTROL_INEFFECTIVE: RiskInputs(7, 6, 5, 6, 6, 7, 6),
    GapCategory.EVIDENCE_MISSING: RiskInputs(5, 3, 3, 4, 4, 4, 4),
    GapCategory.EVIDENCE_EXPIRED: RiskInputs(5, 4, 3, 4, 5, 4, 6),
    GapCategory.EVIDENCE_CONFLICT: RiskInputs(6, 5, 4, 5, 5, 5, 5),
    GapCategory.REGULATORY_CONFLICT: RiskInputs(9, 6, 6, 6, 5, 8, 6),
    GapCategory.PROCESS_DEFICIENCY: RiskInputs(5, 5, 4, 5, 5, 5, 5),
}


async def run_risk_assessment(
    db: AsyncSession,
    organization_id: uuid.UUID,
    gap_id: uuid.UUID,
    requested_by_id: uuid.UUID,
    overrides: Optional[dict] = None,
) -> dict:
    gap = await db.get(ComplianceGap, gap_id)
    if gap is None:
        raise ValueError(f"ComplianceGap {gap_id} not found")

    async with AgentRun(
        db,
        organization_id,
        AgentName.RISK_ASSESSMENT,
        task=f"Calculate risk for gap {gap_id}",
        idempotency_key=f"risk-assessment:{gap_id}",
        requested_by_id=requested_by_id,
    ) as run:
        if run.is_replay:
            return {"replayed": True, "execution_id": str(run.execution.id)}

        base = GAP_CATEGORY_BASE_RISK.get(gap.category, RiskInputs(5, 5, 5, 5, 5, 5, 5))
        inputs_dict = {
            "regulatory_impact": base.regulatory_impact,
            "customer_impact": base.customer_impact,
            "financial_impact": base.financial_impact,
            "business_impact": base.business_impact,
            "likelihood": base.likelihood,
            "severity": base.severity,
            "urgency": base.urgency,
        }
        if overrides:
            inputs_dict.update({k: v for k, v in overrides.items() if k in inputs_dict})

        risk_inputs = RiskInputs(**inputs_dict)
        result = calculate_risk(risk_inputs)

        await run.log_step(
            "calculate_risk",
            tool_name="calculate_risk",
            tool_input={"gap_category": gap.category.value, "inputs": inputs_dict},
            tool_output={"score": result.score, "priority": result.priority.value},
            reasoning=result.rationale,
        )

        risk = RiskAssessment(
            gap_id=gap.id,
            regulatory_impact=risk_inputs.regulatory_impact,
            customer_impact=risk_inputs.customer_impact,
            financial_impact=risk_inputs.financial_impact,
            business_impact=risk_inputs.business_impact,
            likelihood=risk_inputs.likelihood,
            severity=risk_inputs.severity,
            urgency=risk_inputs.urgency,
            score=result.score,
            priority=result.priority,
            rationale=result.rationale,
            model_version=result.model_version,
        )
        db.add(risk)
        await db.flush()

        await run.complete({"risk_assessment_id": str(risk.id), "score": result.score, "priority": result.priority.value})
        return {
            "execution_id": str(run.execution.id),
            "risk_assessment_id": str(risk.id),
            "score": result.score,
            "priority": result.priority.value,
        }
