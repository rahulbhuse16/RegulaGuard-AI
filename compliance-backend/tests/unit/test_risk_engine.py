import pytest

from app.models.enums import RiskPriority
from app.services.risk_engine import RiskInputs, calculate_risk


def test_all_max_inputs_yield_critical():
    inputs = RiskInputs(10, 10, 10, 10, 10, 10, 10)
    result = calculate_risk(inputs)
    assert result.score == 10.0
    assert result.priority == RiskPriority.CRITICAL


def test_all_zero_inputs_yield_low():
    inputs = RiskInputs(0, 0, 0, 0, 0, 0, 0)
    result = calculate_risk(inputs)
    assert result.score == 0.0
    assert result.priority == RiskPriority.LOW


def test_known_midpoint_value():
    # regulatory_impact and customer_impact drive the score up; rest low.
    inputs = RiskInputs(
        regulatory_impact=10,
        customer_impact=10,
        financial_impact=0,
        business_impact=0,
        likelihood=0,
        severity=0,
        urgency=0,
    )
    result = calculate_risk(inputs)
    assert result.score == pytest.approx(5.0)
    assert result.priority == RiskPriority.MEDIUM


def test_invalid_input_raises():
    inputs = RiskInputs(11, 0, 0, 0, 0, 0, 0)
    with pytest.raises(ValueError):
        calculate_risk(inputs)


def test_rationale_mentions_model_version():
    inputs = RiskInputs(5, 5, 5, 5, 5, 5, 5)
    result = calculate_risk(inputs)
    assert "risk_model_v1" in result.rationale
