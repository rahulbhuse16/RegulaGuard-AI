"""
Tests the structured-output validation boundary that every agent depends on.
The LLM is always mocked here -- these tests must never make a live network
call to Groq or any other provider.
"""
from unittest.mock import patch

from pydantic import BaseModel

from app.services import llm_service


class DummySchema(BaseModel):
    name: str
    confidence: float


def test_valid_structured_output_is_parsed():
    with patch.object(llm_service, "get_raw_response", return_value='{"name": "AML monitoring", "confidence": 0.9}'):
        result = llm_service.get_structured_response("system", "user", DummySchema)
    assert result is not None
    assert result.name == "AML monitoring"
    assert result.confidence == 0.9


def test_output_wrapped_in_markdown_fences_is_parsed():
    raw = '```json\n{"name": "KYC", "confidence": 0.7}\n```'
    with patch.object(llm_service, "get_raw_response", return_value=raw):
        result = llm_service.get_structured_response("system", "user", DummySchema)
    assert result is not None
    assert result.name == "KYC"


def test_malformed_json_returns_none_not_an_exception():
    with patch.object(llm_service, "get_raw_response", return_value="not json at all {{{"):
        result = llm_service.get_structured_response("system", "user", DummySchema)
    assert result is None


def test_schema_violation_returns_none():
    # Missing required 'confidence' field.
    with patch.object(llm_service, "get_raw_response", return_value='{"name": "KYC"}'):
        result = llm_service.get_structured_response("system", "user", DummySchema)
    assert result is None


def test_abstention_returns_none():
    with patch.object(llm_service, "get_raw_response", return_value="INSUFFICIENT_EVIDENCE"):
        result = llm_service.get_structured_response("system", "user", DummySchema)
    assert result is None


def test_llm_unavailable_returns_none_rather_than_raising():
    with patch.object(llm_service, "get_raw_response", side_effect=llm_service.LLMUnavailableError("timeout")):
        result = llm_service.get_structured_response("system", "user", DummySchema)
    assert result is None


def test_retry_then_success_on_transient_failure():
    """The tenacity-wrapped _invoke should retry on transient errors before succeeding."""
    calls = {"count": 0}

    class FakeResponse:
        content = '{"name": "Reg reporting", "confidence": 0.5}'

    def flaky_invoke(messages):
        calls["count"] += 1
        if calls["count"] < 2:
            raise ConnectionError("transient network error")
        return FakeResponse()

    fake_model = type("FakeModel", (), {"invoke": staticmethod(flaky_invoke)})()

    with patch.object(llm_service, "_get_chat_model", return_value=fake_model):
        raw = llm_service._invoke("system", "user")
    assert calls["count"] == 2
    assert "Reg reporting" in raw
