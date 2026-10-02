"""
Import every model module here so Base.metadata is fully populated for
Alembic autogenerate and for `Base.metadata.create_all` in tests.
"""
from app.models import (  # noqa: F401
    identity,
    documents,
    regulatory,
    controls,
    evidence,
    assessment,
    remediation,
    analysis,
    agent_execution,
    audit_monitoring,
)
