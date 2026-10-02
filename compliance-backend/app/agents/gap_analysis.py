"""
Gap Analysis Agent (Feature 8).

Gap identification is a deterministic rule evaluation over already-validated
domain state (obligation review status, mapping status, control
effectiveness, evidence sufficiency) -- there is no ambiguity here that an
LLM needs to resolve, so no LLM call is made. This keeps the workflow fast,
free, and fully explainable, per the "avoid unnecessary LLM calls" and
"deterministic risk model" principles in the spec. It is still wrapped in
AgentRun so it shows up in Agent Execution history like every other step of
the pipeline.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import AgentRun
from app.models.assessment import ComplianceGap
from app.models.controls import Control, ControlAssessment, ControlMapping
from app.models.enums import (
    AgentName,
    ControlEffectiveness,
    EvidenceSufficiency,
    GapCategory,
    MappingStatus,
    ReviewStatus,
)
from app.models.evidence import EvidenceAssessment
from app.models.regulatory import RegulatoryObligation


async def run_gap_analysis(
    db: AsyncSession, organization_id: uuid.UUID, obligation_id: uuid.UUID, requested_by_id: uuid.UUID
) -> dict:
    obligation = await db.get(RegulatoryObligation, obligation_id)
    if obligation is None:
        raise ValueError(f"RegulatoryObligation {obligation_id} not found")

    async with AgentRun(
        db,
        organization_id,
        AgentName.GAP_ANALYSIS,
        task=f"Identify gaps for obligation {obligation_id}",
        idempotency_key=f"gap-analysis:{obligation_id}",
        requested_by_id=requested_by_id,
    ) as run:
        if run.is_replay:
            return {"replayed": True, "execution_id": str(run.execution.id)}

        created_gaps: List[str] = []

        mapping_result = await db.execute(
            select(ControlMapping).where(ControlMapping.obligation_id == obligation.id)
        )
        mappings = mapping_result.scalars().all()
        approved_mappings = [m for m in mappings if m.review_status == ReviewStatus.APPROVED]

        await run.log_step(
            "evaluate_mapping_coverage",
            tool_name="create_gap",
            tool_input={"obligation_id": str(obligation_id)},
            tool_output={"mapping_count": len(mappings), "approved_count": len(approved_mappings)},
        )

        if not mappings:
            gap = ComplianceGap(
                obligation_id=obligation.id,
                category=GapCategory.OBLIGATION_UNMAPPED,
                description=f"Obligation has no candidate control mappings at all.",
            )
            db.add(gap)
            await db.flush()
            created_gaps.append(str(gap.id))
        else:
            for mapping in approved_mappings:
                if mapping.status == MappingStatus.NONE:
                    continue
                if mapping.status == MappingStatus.CONFLICT:
                    gap = ComplianceGap(
                        obligation_id=obligation.id, control_id=mapping.control_id,
                        category=GapCategory.REGULATORY_CONFLICT,
                        description="Approved mapping indicates the control's procedure may conflict with the obligation.",
                    )
                    db.add(gap)
                    await db.flush()
                    created_gaps.append(str(gap.id))
                elif mapping.status == MappingStatus.PARTIAL:
                    gap = ComplianceGap(
                        obligation_id=obligation.id, control_id=mapping.control_id,
                        category=GapCategory.CONTROL_PARTIAL,
                        description="Approved mapping only partially covers the obligation's requirements.",
                    )
                    db.add(gap)
                    await db.flush()
                    created_gaps.append(str(gap.id))

                # Control effectiveness gaps
                assessment_result = await db.execute(
                    select(ControlAssessment)
                    .where(ControlAssessment.control_id == mapping.control_id)
                    .order_by(ControlAssessment.created_at.desc())
                    .limit(1)
                )
                latest_assessment = assessment_result.scalar_one_or_none()
                if latest_assessment and latest_assessment.effectiveness in (
                    ControlEffectiveness.INEFFECTIVE,
                    ControlEffectiveness.NOT_TESTED,
                ):
                    category = (
                        GapCategory.CONTROL_INEFFECTIVE
                        if latest_assessment.effectiveness == ControlEffectiveness.INEFFECTIVE
                        else GapCategory.CONTROL_MISSING
                    )
                    gap = ComplianceGap(
                        obligation_id=obligation.id, control_id=mapping.control_id,
                        category=category,
                        description=f"Latest control assessment: {latest_assessment.effectiveness.value}.",
                    )
                    db.add(gap)
                    await db.flush()
                    created_gaps.append(str(gap.id))

                # Evidence gaps
                evidence_result = await db.execute(
                    select(EvidenceAssessment)
                    .join(EvidenceAssessment.evidence)
                    .where(EvidenceAssessment.control_id == mapping.control_id)
                    .order_by(EvidenceAssessment.created_at.desc())
                    .limit(1)
                )
                latest_evidence_assessment = evidence_result.scalar_one_or_none()
                if latest_evidence_assessment:
                    evidence_gap_map = {
                        EvidenceSufficiency.MISSING: GapCategory.EVIDENCE_MISSING,
                        EvidenceSufficiency.EXPIRED: GapCategory.EVIDENCE_EXPIRED,
                        EvidenceSufficiency.CONTRADICTORY: GapCategory.EVIDENCE_CONFLICT,
                    }
                    category = evidence_gap_map.get(latest_evidence_assessment.sufficiency)
                    if category:
                        gap = ComplianceGap(
                            obligation_id=obligation.id, control_id=mapping.control_id,
                            evidence_id=latest_evidence_assessment.evidence_id,
                            category=category,
                            description=f"Evidence sufficiency assessed as {latest_evidence_assessment.sufficiency.value}.",
                        )
                        db.add(gap)
                        await db.flush()
                        created_gaps.append(str(gap.id))

        for gap_id in created_gaps:
            gap_obj = await db.get(ComplianceGap, gap_id)
            gap_obj.agent_execution_id = run.execution.id
        await db.flush()

        await run.complete({"gaps_created": len(created_gaps), "gap_ids": created_gaps})
        return {"execution_id": str(run.execution.id), "gaps_created": len(created_gaps), "gap_ids": created_gaps}
