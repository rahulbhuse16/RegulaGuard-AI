"""
What-If / Simulation service (Feature 12).

Runs a lightweight impact estimate against a hypothetical scenario
(regulation X becomes applicable to product Y in jurisdiction Z, etc.)
WITHOUT writing to any real compliance-state tables (ComplianceGap,
RiskAssessment, Remediation, ControlMapping, ...). The only row persisted
is the Simulation record itself, and every returned finding is explicitly
tagged "SIMULATION" so it can never be mistaken for an actual assessment.

This reuses the same deterministic risk lookup used by the real Risk
Assessment Agent so simulated risk numbers are produced by the identical,
documented formula -- just against hypothetical gap categories rather than
persisted ComplianceGap rows.
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.risk_assessment import GAP_CATEGORY_BASE_RISK
from app.models.analysis import Simulation
from app.models.controls import Control
from app.models.enums import GapCategory
from app.models.regulatory import Regulation
from app.services.risk_engine import calculate_risk


async def run_simulation(
    db: AsyncSession,
    organization_id: uuid.UUID,
    requested_by_id: uuid.UUID,
    regulation_id: Optional[uuid.UUID],
    product_id: Optional[uuid.UUID],
    jurisdiction_id: Optional[uuid.UUID],
    business_unit_id: Optional[uuid.UUID],
    hypothetical_effective_date: Optional[date],
    assumptions: Optional[str],
) -> dict:
    regulation = await db.get(Regulation, regulation_id) if regulation_id else None

    # Estimate affected controls: any control tagged to the same product/business unit,
    # since a newly-applicable regulation would need coverage from that existing surface.
    control_stmt = select(Control).where(Control.organization_id == organization_id)
    if product_id:
        control_stmt = control_stmt.where(Control.product_id == product_id)
    if business_unit_id:
        control_stmt = control_stmt.where(Control.business_unit_id == business_unit_id)
    result = await db.execute(control_stmt)
    affected_controls = result.scalars().all()

    # Hypothetical gap categories a newly-applicable regulation typically creates,
    # since no control mapping exists yet by definition of "what if this became applicable".
    hypothetical_gaps: List[dict] = []
    if not affected_controls:
        hypothetical_gaps.append(
            {
                "category": GapCategory.OBLIGATION_UNMAPPED.value,
                "description": "No existing controls found for the specified product/business unit scope; "
                "obligations under this regulation would start fully unmapped.",
            }
        )
    else:
        hypothetical_gaps.append(
            {
                "category": GapCategory.CONTROL_PARTIAL.value,
                "description": f"{len(affected_controls)} existing control(s) found in scope, but none are yet "
                "mapped or tested against this regulation's obligations -- coverage is unverified, not confirmed.",
            }
        )

    risk_findings = []
    for gap in hypothetical_gaps:
        category = GapCategory(gap["category"])
        base_inputs = GAP_CATEGORY_BASE_RISK.get(category)
        if base_inputs:
            risk_result = calculate_risk(base_inputs)
            risk_findings.append(
                {
                    "gap_category": category.value,
                    "estimated_score": risk_result.score,
                    "estimated_priority": risk_result.priority.value,
                    "model_version": risk_result.model_version,
                }
            )

    result_payload = {
        "result_type": "SIMULATION",
        "regulation": regulation.title if regulation else None,
        "affected_controls": [{"id": str(c.id), "name": c.name} for c in affected_controls],
        "potential_gaps": hypothetical_gaps,
        "estimated_risk": risk_findings,
        "remediation_requirements": (
            "Formal control mapping and evidence collection would be required before this regulation's "
            "obligations could be marked compliant." if hypothetical_gaps else "No gaps estimated."
        ),
        "assumptions": assumptions,
        "note": "This is a SIMULATION only. No actual compliance state, gap, or risk record was created or modified.",
    }

    simulation = Simulation(
        organization_id=organization_id,
        regulation_id=regulation_id,
        product_id=product_id,
        jurisdiction_id=jurisdiction_id,
        business_unit_id=business_unit_id,
        hypothetical_effective_date=hypothetical_effective_date,
        assumptions=assumptions,
        result_json=result_payload,
        requested_by_id=requested_by_id,
    )
    db.add(simulation)
    await db.flush()

    return {"simulation_id": str(simulation.id), **result_payload}
