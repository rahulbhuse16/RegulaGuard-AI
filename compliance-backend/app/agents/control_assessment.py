"""
Control Assessment Agent (Feature 6).

Considers design, test history, exceptions, and evidence recency to reach an
effectiveness verdict. The LLM synthesizes the narrative reasoning; it does
NOT invent the effectiveness label from nothing -- the most recent
ControlTest.result is the anchor, and the LLM is asked to corroborate or
flag inconsistency against the supporting evidence, defaulting to NOT_TESTED
when there is no test history at all (a deterministic, non-LLM decision).
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import AgentRun
from app.models.controls import Control, ControlAssessment, ControlTest
from app.models.enums import AgentName, ControlEffectiveness
from app.models.evidence import Evidence
from app.services.llm_service import get_structured_response


class AssessmentReasoning(BaseModel):
    reasoning: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    flags_inconsistency: bool = Field(default=False, description="True if evidence contradicts the test result")


ASSESSMENT_SYSTEM_PROMPT = """\
You are writing the supporting reasoning for a control-effectiveness
assessment in a banking compliance system. You are given the control's most
recent test result and any recent evidence/exceptions inside <user_input>
tags. Do NOT change the effectiveness label yourself -- it has already been
determined deterministically from test history. Your job is only to:
1. Write a clear, evidence-grounded rationale for why that label is
   supported by the facts given.
2. Set flags_inconsistency = true if the evidence you were given appears to
   contradict or undercut the stated test result (e.g. severe exceptions
   noted but result marked EFFECTIVE).
If there isn't enough information to write a grounded rationale, say so
plainly rather than inventing detail.
"""


async def run_control_assessment(
    db: AsyncSession, organization_id: uuid.UUID, control_id: uuid.UUID, requested_by_id: uuid.UUID
) -> dict:
    control = await db.get(Control, control_id)
    if control is None:
        raise ValueError(f"Control {control_id} not found")

    async with AgentRun(
        db,
        organization_id,
        AgentName.CONTROL_ASSESSMENT,
        task=f"Assess effectiveness of control {control_id}",
        idempotency_key=f"assess-control:{control_id}",
        requested_by_id=requested_by_id,
    ) as run:
        if run.is_replay:
            return {"replayed": True, "execution_id": str(run.execution.id)}

        test_result = await db.execute(
            select(ControlTest).where(ControlTest.control_id == control.id).order_by(ControlTest.test_date.desc()).limit(1)
        )
        latest_test = test_result.scalar_one_or_none()

        evidence_result = await db.execute(select(Evidence).where(Evidence.control_id == control.id))
        evidence_items = evidence_result.scalars().all()

        await run.log_step(
            "get_control_evidence",
            tool_name="get_control_evidence",
            tool_input={"control_id": str(control_id)},
            tool_output={"evidence_count": len(evidence_items), "has_test_history": latest_test is not None},
        )

        # Deterministic effectiveness decision -- never left to the LLM.
        if latest_test is None:
            effectiveness = ControlEffectiveness.NOT_TESTED
        elif latest_test.test_date < date.today() - timedelta(days=365):
            # Stale test -> cannot claim current effectiveness.
            effectiveness = ControlEffectiveness.NOT_TESTED
        else:
            effectiveness = latest_test.result

        evidence_summary = "\n".join(
            f"- {e.description or 'Untitled evidence'} (collected {e.collected_date}, expires {e.expiry_date})"
            for e in evidence_items
        ) or "No evidence on file."

        user_prompt = (
            f"<user_input>\n"
            f"CONTROL: {control.name}\n"
            f"Latest test date: {latest_test.test_date if latest_test else 'N/A'}\n"
            f"Latest test result: {latest_test.result.value if latest_test else 'N/A'}\n"
            f"Exceptions noted: {latest_test.exceptions_noted if latest_test else 'N/A'}\n"
            f"Determined effectiveness label: {effectiveness.value}\n"
            f"Evidence on file:\n{evidence_summary}\n"
            f"</user_input>"
        )

        reasoning_obj = get_structured_response(ASSESSMENT_SYSTEM_PROMPT, user_prompt, AssessmentReasoning)
        if reasoning_obj is None:
            reasoning_text = (
                f"Effectiveness determined as {effectiveness.value} from test history "
                f"(latest test: {latest_test.test_date if latest_test else 'none on file'}). "
                "LLM narrative unavailable (INSUFFICIENT_EVIDENCE or provider error)."
            )
            confidence = 0.5
        else:
            reasoning_text = reasoning_obj.reasoning
            confidence = reasoning_obj.confidence
            if reasoning_obj.flags_inconsistency:
                reasoning_text += " [FLAGGED: possible inconsistency between evidence and test result -- recommend human review.]"

        assessment = ControlAssessment(
            control_id=control.id,
            effectiveness=effectiveness,
            reasoning=reasoning_text,
            supporting_evidence_ids=[str(e.id) for e in evidence_items],
            confidence=confidence,
            agent_execution_id=run.execution.id,
        )
        db.add(assessment)
        await db.flush()

        await run.complete(
            {"assessment_id": str(assessment.id), "effectiveness": effectiveness.value}, confidence=confidence
        )
        return {"execution_id": str(run.execution.id), "assessment_id": str(assessment.id), "effectiveness": effectiveness.value}
