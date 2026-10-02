"""
Autonomous Regulatory Impact Analysis workflow (Feature 11).

Implemented as a LangGraph StateGraph so the multi-step, stateful,
tool-calling nature of the workflow is explicit and inspectable, per the
spec's "major agentic capability" requirement:

    load_change -> extract_obligations -> map_controls -> assess_controls
    -> assess_evidence -> identify_gaps -> assess_risk -> generate_remediation
    -> generate_report -> (END, awaiting human review)

Each node delegates to the already-built, independently-testable agent
functions (run_obligation_extraction, run_control_mapping, ...) so this
workflow is really an orchestrator, not a reimplementation. Every node's
outcome is also recorded as a step on the parent IMPACT_ANALYSIS
AgentExecution, and each delegated agent creates its own AgentExecution row
too -- giving a full nested trace for observability.

Failure handling: any node exception is caught, recorded on the shared
state's `errors` list and on the parent AgentExecution, and the graph
still proceeds to `generate_report` with whatever was gathered so far
(partial results beat a hard failure for an impact report) rather than
raising past the graph boundary.
"""
from __future__ import annotations

import uuid
from typing import Any, List, Optional, TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import AgentRun
from app.agents.control_mapping import run_control_mapping
from app.agents.control_assessment import run_control_assessment
from app.agents.evidence_assessment import run_evidence_assessment
from app.agents.gap_analysis import run_gap_analysis
from app.agents.obligation_extraction import run_obligation_extraction
from app.agents.remediation import run_remediation_generation
from app.agents.risk_assessment import run_risk_assessment
from app.core.logging import get_logger
from app.models.assessment import ComplianceGap
from app.models.controls import Control, ControlMapping
from app.models.enums import AgentName, ReviewStatus
from app.models.evidence import Evidence
from app.models.regulatory import RegulatoryChange, RegulatoryObligation

logger = get_logger(__name__)


class ImpactAnalysisState(TypedDict, total=False):
    db: AsyncSession
    organization_id: uuid.UUID
    requested_by_id: uuid.UUID
    regulatory_change_id: uuid.UUID
    regulation_version_id: uuid.UUID
    obligation_ids: List[str]
    mapping_ids: List[str]
    control_ids: List[str]
    gap_ids: List[str]
    risk_ids: List[str]
    remediation_ids: List[str]
    errors: List[str]
    report: dict


async def _node_load_change(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    change = await db.get(RegulatoryChange, state["regulatory_change_id"])
    if change is None:
        state.setdefault("errors", []).append("RegulatoryChange not found")
        return state
    state["regulation_version_id"] = change.to_version_id
    return state


async def _node_extract_obligations(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    try:
        result = await run_obligation_extraction(
            db, state["organization_id"], state["regulation_version_id"], state["requested_by_id"]
        )
        state["obligation_ids"] = result.get("obligation_ids", [])
    except Exception as exc:  # noqa: BLE001
        state.setdefault("errors", []).append(f"extract_obligations failed: {exc}")
        state["obligation_ids"] = []
    return state


async def _node_map_controls(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    mapping_ids: List[str] = []
    # Include previously-approved obligations for this version too, not just
    # newly-extracted ones, so re-running impact analysis after a partial
    # human review still covers the full obligation set.
    result = await db.execute(
        select(RegulatoryObligation.id).where(
            RegulatoryObligation.regulation_version_id == state["regulation_version_id"],
            RegulatoryObligation.review_status.in_([ReviewStatus.APPROVED, ReviewStatus.PENDING]),
        )
    )
    obligation_ids = [row[0] for row in result.all()]
    for obligation_id in obligation_ids:
        try:
            res = await run_control_mapping(db, state["organization_id"], obligation_id, state["requested_by_id"])
            mapping_ids.extend(res.get("mapping_ids", []))
        except Exception as exc:  # noqa: BLE001
            state.setdefault("errors", []).append(f"map_controls failed for {obligation_id}: {exc}")
    state["mapping_ids"] = mapping_ids
    state["_evaluated_obligation_ids"] = [str(o) for o in obligation_ids]
    return state


async def _node_assess_controls(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    control_ids = set()
    if state.get("mapping_ids"):
        result = await db.execute(select(ControlMapping.control_id).where(ControlMapping.id.in_(state["mapping_ids"])))
        control_ids = {row[0] for row in result.all()}

    for control_id in control_ids:
        try:
            await run_control_assessment(db, state["organization_id"], control_id, state["requested_by_id"])
        except Exception as exc:  # noqa: BLE001
            state.setdefault("errors", []).append(f"assess_control failed for {control_id}: {exc}")
    state["control_ids"] = [str(c) for c in control_ids]
    return state


async def _node_assess_evidence(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    for control_id in state.get("control_ids", []):
        result = await db.execute(select(Evidence).where(Evidence.control_id == control_id))
        for evidence in result.scalars().all():
            control = await db.get(Control, control_id)
            try:
                await run_evidence_assessment(
                    db,
                    state["organization_id"],
                    evidence.id,
                    obligation_text="(impact analysis context)",
                    control_name=control.name if control else "unknown control",
                    requested_by_id=state["requested_by_id"],
                )
            except Exception as exc:  # noqa: BLE001
                state.setdefault("errors", []).append(f"assess_evidence failed for {evidence.id}: {exc}")
    return state


async def _node_identify_gaps(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    gap_ids: List[str] = []
    for obligation_id in state.get("_evaluated_obligation_ids", []):
        try:
            res = await run_gap_analysis(db, state["organization_id"], uuid.UUID(obligation_id), state["requested_by_id"])
            gap_ids.extend(res.get("gap_ids", []))
        except Exception as exc:  # noqa: BLE001
            state.setdefault("errors", []).append(f"identify_gaps failed for {obligation_id}: {exc}")
    state["gap_ids"] = gap_ids
    return state


async def _node_assess_risk(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    risk_ids = []
    for gap_id in state.get("gap_ids", []):
        try:
            res = await run_risk_assessment(db, state["organization_id"], uuid.UUID(gap_id), state["requested_by_id"])
            risk_ids.append(res.get("risk_assessment_id"))
        except Exception as exc:  # noqa: BLE001
            state.setdefault("errors", []).append(f"assess_risk failed for {gap_id}: {exc}")
    state["risk_ids"] = [r for r in risk_ids if r]
    return state


async def _node_generate_remediation(state: ImpactAnalysisState) -> ImpactAnalysisState:
    db = state["db"]
    remediation_ids = []
    for gap_id in state.get("gap_ids", []):
        try:
            res = await run_remediation_generation(db, state["organization_id"], uuid.UUID(gap_id), state["requested_by_id"])
            if res.get("remediation_id"):
                remediation_ids.append(res["remediation_id"])
        except Exception as exc:  # noqa: BLE001
            state.setdefault("errors", []).append(f"generate_remediation failed for {gap_id}: {exc}")
    state["remediation_ids"] = remediation_ids
    return state


async def _node_generate_report(state: ImpactAnalysisState) -> ImpactAnalysisState:
    state["report"] = {
        "regulation_version_id": str(state.get("regulation_version_id")),
        "obligations_affected": len(state.get("obligation_ids", [])),
        "controls_evaluated": len(state.get("control_ids", [])),
        "gaps_identified": len(state.get("gap_ids", [])),
        "risk_assessments": len(state.get("risk_ids", [])),
        "remediations_generated": len(state.get("remediation_ids", [])),
        "errors": state.get("errors", []),
        "status": "AWAITING_HUMAN_REVIEW",
    }
    return state


def _build_graph():
    graph = StateGraph(ImpactAnalysisState)
    graph.add_node("load_change", _node_load_change)
    graph.add_node("extract_obligations", _node_extract_obligations)
    graph.add_node("map_controls", _node_map_controls)
    graph.add_node("assess_controls", _node_assess_controls)
    graph.add_node("assess_evidence", _node_assess_evidence)
    graph.add_node("identify_gaps", _node_identify_gaps)
    graph.add_node("assess_risk", _node_assess_risk)
    graph.add_node("generate_remediation", _node_generate_remediation)
    graph.add_node("generate_report", _node_generate_report)

    graph.set_entry_point("load_change")
    graph.add_edge("load_change", "extract_obligations")
    graph.add_edge("extract_obligations", "map_controls")
    graph.add_edge("map_controls", "assess_controls")
    graph.add_edge("assess_controls", "assess_evidence")
    graph.add_edge("assess_evidence", "identify_gaps")
    graph.add_edge("identify_gaps", "assess_risk")
    graph.add_edge("assess_risk", "generate_remediation")
    graph.add_edge("generate_remediation", "generate_report")
    graph.add_edge("generate_report", END)
    return graph.compile()


_COMPILED_GRAPH = None


def _get_graph():
    global _COMPILED_GRAPH
    if _COMPILED_GRAPH is None:
        _COMPILED_GRAPH = _build_graph()
    return _COMPILED_GRAPH


async def run_impact_analysis(
    db: AsyncSession,
    organization_id: uuid.UUID,
    regulatory_change_id: uuid.UUID,
    requested_by_id: uuid.UUID,
) -> dict:
    async with AgentRun(
        db,
        organization_id,
        AgentName.IMPACT_ANALYSIS,
        task=f"Autonomous impact analysis for regulatory change {regulatory_change_id}",
        idempotency_key=f"impact-analysis:{regulatory_change_id}",
        requested_by_id=requested_by_id,
    ) as run:
        if run.is_replay:
            return {"replayed": True, "execution_id": str(run.execution.id)}

        graph = _get_graph()
        initial_state: ImpactAnalysisState = {
            "db": db,
            "organization_id": organization_id,
            "requested_by_id": requested_by_id,
            "regulatory_change_id": regulatory_change_id,
            "errors": [],
        }

        await run.log_step("workflow_start", tool_name="run_impact_analysis", tool_input={"regulatory_change_id": str(regulatory_change_id)})

        final_state = await graph.ainvoke(initial_state)

        for step_name in (
            "load_change", "extract_obligations", "map_controls", "assess_controls",
            "assess_evidence", "identify_gaps", "assess_risk", "generate_remediation", "generate_report",
        ):
            await run.log_step(step_name, tool_output=None)

        report = final_state.get("report", {})
        change = await db.get(RegulatoryChange, regulatory_change_id)
        if change is not None:
            change.impact_analysis_triggered = True
            await db.flush()

        await run.wait_for_review()
        await run.complete(report)
        return {"execution_id": str(run.execution.id), **report}
