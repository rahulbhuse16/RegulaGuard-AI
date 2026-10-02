"""
Seeds realistic DEMO/TEST data covering the full traceability chain so the
20-step demo scenario in the spec can be walked through end-to-end.

Run with:
    python -m scripts.seed_demo_data

All records created here are clearly demo data (Regulation.is_demo_data=True,
organization named "Demo Bank (DEMO DATA)") and are safe to wipe/reseed.
"""
import asyncio
import uuid
from datetime import date, timedelta

from app.core.security import Role, hash_password
from app.db.session import AsyncSessionLocal
from app.models.assessment import ComplianceGap, RiskAssessment
from app.models.analysis import Contradiction
from app.models.controls import BusinessUnit, Control, ControlMapping, ControlTest, Product
from app.models.enums import (
    ContradictionType,
    ControlEffectiveness,
    GapCategory,
    MappingStatus,
    RemediationProvenance,
    ReviewStatus,
    RiskPriority,
)
from app.models.evidence import Evidence
from app.models.identity import Organization, User
from app.models.regulatory import Regulation, RegulationVersion, RegulatoryChange, RegulatoryObligation, Regulator, Jurisdiction
from app.models.remediation import Remediation
from app.services.risk_engine import RiskInputs, calculate_risk

DEMO_TAG = "(DEMO DATA)"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        org = Organization(name=f"Demo Bank {DEMO_TAG}")
        db.add(org)
        await db.flush()

        admin = User(
            organization_id=org.id,
            email="admin@demobank.test",
            full_name="Demo Admin",
            hashed_password=hash_password("DemoPass123!"),
            role=Role.ADMIN,
        )
        analyst = User(
            organization_id=org.id,
            email="analyst@demobank.test",
            full_name="Demo Analyst",
            hashed_password=hash_password("DemoPass123!"),
            role=Role.COMPLIANCE_ANALYST,
        )
        db.add_all([admin, analyst])
        await db.flush()

        # --- Regulators & Jurisdictions ---
        fca = Regulator(name="Financial Conduct Authority (DEMO)", short_code="FCA")
        occ = Regulator(name="Office of the Comptroller of the Currency (DEMO)", short_code="OCC")
        uk = Jurisdiction(name="United Kingdom", country_code="GB")
        us = Jurisdiction(name="United States", country_code="US")
        db.add_all([fca, occ, uk, us])
        await db.flush()

        # --- Business units / products ---
        retail_bu = BusinessUnit(organization_id=org.id, name="Retail Banking")
        db.add(retail_bu)
        await db.flush()
        savings_product = Product(organization_id=org.id, name="Instant Access Savings", business_unit_id=retail_bu.id)
        db.add(savings_product)
        await db.flush()

        # --- Regulation with two versions (Feature 2 needs this) ---
        consumer_duty = Regulation(
            regulator_id=fca.id,
            jurisdiction_id=uk.id,
            title=f"Consumer Duty Rules {DEMO_TAG}",
            code="FCA-PS22/9",
            summary="Cross-cutting rules requiring firms to act to deliver good outcomes for retail customers.",
            is_demo_data=True,
        )
        db.add(consumer_duty)
        await db.flush()

        v1 = RegulationVersion(regulation_id=consumer_duty.id, version_label="2022-07", publication_date=date(2022, 7, 27), effective_date=date(2023, 7, 31), is_current=False)
        v2 = RegulationVersion(regulation_id=consumer_duty.id, version_label="2024-01", publication_date=date(2024, 1, 15), effective_date=date(2024, 7, 31), is_current=True)
        db.add_all([v1, v2])
        await db.flush()

        change = RegulatoryChange(
            regulation_id=consumer_duty.id,
            from_version_id=v1.id,
            to_version_id=v2.id,
            change_type="MODIFIED",
            summary=f"{DEMO_TAG} Strengthened requirement for proactive identification of vulnerable customers.",
            confidence=0.86,
        )
        db.add(change)

        # A second regulation for cross-regulation / contradiction demo
        safeguarding_rules = Regulation(
            regulator_id=occ.id,
            jurisdiction_id=us.id,
            title=f"Customer Fund Safeguarding Rules {DEMO_TAG}",
            code="OCC-2023-14",
            summary="Requirements for safeguarding customer deposits and timely disclosure.",
            is_demo_data=True,
        )
        db.add(safeguarding_rules)
        await db.flush()
        v3 = RegulationVersion(regulation_id=safeguarding_rules.id, version_label="2023-01", publication_date=date(2023, 1, 10), effective_date=date(2023, 6, 1), is_current=True)
        db.add(v3)
        await db.flush()

        # --- Obligations ---
        ob1 = RegulatoryObligation(
            regulation_version_id=v2.id,
            obligation_text=f"{DEMO_TAG} Firms must proactively identify and support customers in vulnerable circumstances.",
            requirement_type="conduct",
            responsible_function="Compliance",
            effective_date=date(2024, 7, 31),
            confidence=0.9,
            review_status=ReviewStatus.APPROVED,
        )
        ob2 = RegulatoryObligation(
            regulation_version_id=v2.id,
            obligation_text=f"{DEMO_TAG} Firms must disclose all fees clearly at account opening within 2 business days.",
            requirement_type="disclosure",
            responsible_function="Retail Operations",
            effective_date=date(2024, 7, 31),
            confidence=0.82,
            review_status=ReviewStatus.PENDING,
        )
        ob3 = RegulatoryObligation(
            regulation_version_id=v3.id,
            obligation_text=f"{DEMO_TAG} Firms must disclose all fees clearly at account opening within 5 business days.",
            requirement_type="disclosure",
            responsible_function="Retail Operations",
            effective_date=date(2023, 6, 1),
            confidence=0.82,
            review_status=ReviewStatus.APPROVED,
        )
        db.add_all([ob1, ob2, ob3])
        await db.flush()

        # Potential contradiction: 2 vs 5 business days for the same kind of disclosure
        contradiction = Contradiction(
            obligation_a_id=ob2.id,
            obligation_b_id=ob3.id,
            contradiction_type=ContradictionType.TIMING,
            explanation=(
                f"{DEMO_TAG} Potential contradiction: one regulation requires fee disclosure within 2 business "
                "days while a related regulation allows 5 business days for a similar disclosure obligation."
            ),
            confidence=0.68,
        )
        db.add(contradiction)

        # --- Controls, mapping, test, evidence ---
        control = Control(
            organization_id=org.id,
            control_code="CTRL-VULN-001",
            name=f"Vulnerable Customer Identification Control {DEMO_TAG}",
            description="Front-line staff flag potential vulnerability indicators during customer interactions.",
            owner="Head of Retail Conduct",
            business_unit_id=retail_bu.id,
            product_id=savings_product.id,
            control_type="conduct",
            frequency="continuous",
            is_preventive=True,
            is_automated=False,
            evidence_requirements="Monthly QA sample of flagged interactions",
            testing_procedure="Sample 25 interactions/month and verify vulnerability flagging accuracy",
        )
        db.add(control)
        await db.flush()

        mapping = ControlMapping(
            obligation_id=ob1.id,
            control_id=control.id,
            status=MappingStatus.PARTIAL,
            confidence=0.71,
            rationale=f"{DEMO_TAG} Control addresses identification but has no defined support-plan follow-up step.",
            review_status=ReviewStatus.PENDING,
        )
        db.add(mapping)

        control_test = ControlTest(
            control_id=control.id,
            test_date=date.today() - timedelta(days=200),
            tester="Internal Audit",
            result=ControlEffectiveness.PARTIALLY_EFFECTIVE,
            exceptions_noted="3 of 25 sampled interactions missed vulnerability indicators.",
        )
        db.add(control_test)
        await db.flush()

        evidence = Evidence(
            control_id=control.id,
            description=f"{DEMO_TAG} Q1 QA sampling report for vulnerable customer identification.",
            collected_date=date.today() - timedelta(days=200),
            expiry_date=date.today() - timedelta(days=20),  # intentionally expired for demo
        )
        db.add(evidence)
        await db.flush()

        # --- Gap + Risk + Remediation ---
        gap = ComplianceGap(
            obligation_id=ob1.id,
            control_id=control.id,
            evidence_id=evidence.id,
            category=GapCategory.EVIDENCE_EXPIRED,
            description=f"{DEMO_TAG} Most recent QA evidence for the vulnerability-identification control expired 20 days ago.",
            is_open=True,
        )
        db.add(gap)
        await db.flush()

        risk_inputs = RiskInputs(
            regulatory_impact=7.5, customer_impact=8.0, financial_impact=4.0,
            business_impact=5.0, likelihood=6.0, severity=6.5, urgency=7.0,
        )
        risk_result = calculate_risk(risk_inputs)
        risk = RiskAssessment(
            gap_id=gap.id,
            regulatory_impact=risk_inputs.regulatory_impact,
            customer_impact=risk_inputs.customer_impact,
            financial_impact=risk_inputs.financial_impact,
            business_impact=risk_inputs.business_impact,
            likelihood=risk_inputs.likelihood,
            severity=risk_inputs.severity,
            urgency=risk_inputs.urgency,
            score=risk_result.score,
            priority=risk_result.priority,
            rationale=risk_result.rationale,
            model_version=risk_result.model_version,
        )
        db.add(risk)

        remediation = Remediation(
            gap_id=gap.id,
            recommendation=f"{DEMO_TAG} Refresh QA sampling evidence and add a quarterly recurring evidence-renewal task.",
            root_cause="No automated reminder existed for evidence expiry.",
            proposed_action="Implement a 90-day evidence refresh cadence with owner reminders.",
            owner="Head of Retail Conduct",
            priority=risk_result.priority,
            target_date=date.today() + timedelta(days=45),
            expected_outcome="Continuously current evidence supporting control effectiveness claims.",
            provenance=RemediationProvenance.AI_GENERATED,
        )
        db.add(remediation)

        await db.commit()
        print("Demo seed data created successfully.")
        print(f"  Organization: {org.name} ({org.id})")
        print(f"  Login: admin@demobank.test / DemoPass123!  (ADMIN)")
        print(f"  Login: analyst@demobank.test / DemoPass123! (COMPLIANCE_ANALYST)")
        print(f"  Regulation with 2 versions: {consumer_duty.title}")
        print(f"  Regulatory change recorded: {change.summary}")
        print(f"  Potential contradiction recorded between obligations {ob2.id} and {ob3.id}")
        print(f"  Gap -> Risk({risk_result.priority.value}, score={risk_result.score}) -> Remediation chain created")


if __name__ == "__main__":
    asyncio.run(seed())
