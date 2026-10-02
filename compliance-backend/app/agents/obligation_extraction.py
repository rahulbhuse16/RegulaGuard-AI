"""
Obligation Extraction Agent.

This is the reference implementation other specialized agents
(ControlMappingAgent, GapAnalysisAgent, RiskAssessmentAgent, ...) should
follow: wrap work in AgentRun, retrieve grounded context, call the LLM only
for structured output, validate before persisting, attach source citations,
and leave the result PENDING for human review.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import AgentRun
from app.core.logging import get_logger
from app.models.documents import SourceCitation
from app.models.enums import AgentName, ReviewStatus
from app.models.regulatory import RegulationVersion, RegulatoryObligation
from app.rag.retrieval import get_all_chunks_for_document
from app.schemas.obligation import ExtractedObligationList
from app.services.llm_service import get_structured_response

logger = get_logger(__name__)

EXTRACTION_SYSTEM_PROMPT = """\
You are extracting discrete regulatory OBLIGATIONS from a chunk of banking
regulatory text supplied inside <retrieved_document> tags below.

An obligation is a specific, actionable requirement imposed on a regulated
entity (e.g. "the bank must...", "institutions shall...", "firms are
required to..."). Ignore preamble, definitions, and non-binding recitals.

For each obligation you find, extract:
- obligation_text: a clear restatement of the requirement
- requirement_type: a short category (reporting, disclosure, capital, conduct,
  data-protection, governance, risk-management, other)
- responsible_function: the likely owning internal function, if inferable
- effective_date_hint: any date mentioned that governs when this applies
- confidence: your confidence (0-1) that this is a real, distinct obligation
- source_text: the exact excerpt from the chunk that supports this obligation

If the chunk contains NO obligations (e.g. it is a table of contents,
definitions section, or purely descriptive text), return an empty list.
"""


async def run_obligation_extraction(
    db: AsyncSession,
    organization_id: uuid.UUID,
    regulation_version_id: uuid.UUID,
    requested_by_id: uuid.UUID,
) -> dict:
    version = await db.get(RegulationVersion, regulation_version_id)
    if version is None:
        raise ValueError(f"RegulationVersion {regulation_version_id} not found")

    async with AgentRun(
        db,
        organization_id,
        AgentName.OBLIGATION_EXTRACTION,
        task=f"Extract obligations for regulation version {regulation_version_id}",
        idempotency_key=f"extract-obligations:{regulation_version_id}",
        requested_by_id=requested_by_id,
    ) as run:
        if run.is_replay:
            return {"replayed": True, "execution_id": str(run.execution.id)}

        # Obligations are extracted from every READY document linked to this version.
        from sqlalchemy import select

        from app.models.documents import Document

        result = await db.execute(
            select(Document).where(Document.regulation_version_id == regulation_version_id)
        )
        documents = result.scalars().all()

        await run.log_step(
            "retrieve_documents",
            tool_name="search_regulations",
            tool_input={"regulation_version_id": str(regulation_version_id)},
            tool_output={"document_count": len(documents)},
        )

        created_obligations: List[str] = []
        total_confidence = []

        for document in documents:
            chunks = await get_all_chunks_for_document(db, document.id)
            await run.log_step(
                "retrieve_document_chunks",
                tool_name="retrieve_document_chunks",
                tool_input={"document_id": str(document.id)},
                tool_output={"chunk_count": len(chunks)},
            )

            for chunk in chunks:
                user_prompt = f"<retrieved_document>\n{chunk.content}\n</retrieved_document>"
                extracted = get_structured_response(
                    system_prompt=EXTRACTION_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    schema=ExtractedObligationList,
                )

                if extracted is None:
                    await run.log_step(
                        f"extract_chunk_{chunk.chunk_index}",
                        reasoning="INSUFFICIENT_EVIDENCE or invalid structured output; skipped.",
                        status="SKIPPED",
                    )
                    continue

                for item in extracted.obligations:
                    effective_date = _parse_date_hint(item.effective_date_hint)
                    obligation = RegulatoryObligation(
                        regulation_version_id=version.id,
                        obligation_text=item.obligation_text,
                        requirement_type=item.requirement_type,
                        responsible_function=item.responsible_function,
                        effective_date=effective_date,
                        confidence=item.confidence,
                        review_status=ReviewStatus.PENDING,
                        source_chunk_id=chunk.id,
                        extraction_agent_execution_id=run.execution.id,
                    )
                    db.add(obligation)
                    await db.flush()

                    db.add(
                        SourceCitation(
                            citing_entity_type="RegulatoryObligation",
                            citing_entity_id=obligation.id,
                            document_id=document.id,
                            document_chunk_id=chunk.id,
                            page_number=chunk.page_number,
                            section=chunk.section,
                            source_text=item.source_text,
                            extraction_confidence=item.confidence,
                        )
                    )
                    created_obligations.append(str(obligation.id))
                    total_confidence.append(item.confidence)

                await run.log_step(
                    f"extract_chunk_{chunk.chunk_index}",
                    tool_name="extract_obligations",
                    tool_output={"obligations_found": len(extracted.obligations)},
                )

        avg_confidence = sum(total_confidence) / len(total_confidence) if total_confidence else None
        await run.wait_for_review()
        result_payload = {
            "obligations_created": len(created_obligations),
            "obligation_ids": created_obligations,
            "review_required": True,
        }
        await run.complete(result_payload, confidence=avg_confidence)
        return {"execution_id": str(run.execution.id), **result_payload}


def _parse_date_hint(hint: str | None) -> date | None:
    if not hint:
        return None
    try:
        return datetime.fromisoformat(hint[:10]).date()
    except ValueError:
        return None
