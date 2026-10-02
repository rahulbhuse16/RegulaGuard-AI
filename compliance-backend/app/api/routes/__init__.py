from fastapi import APIRouter

from app.api.routes import (
    agent_executions,
    analysis,
    audit,
    auth,
    compliance_pipeline,
    dashboard,
    documents,
    monitoring,
    obligations,
    regulations,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(regulations.router)
api_router.include_router(documents.router)
api_router.include_router(obligations.router)
api_router.include_router(compliance_pipeline.router)
api_router.include_router(analysis.router)
api_router.include_router(agent_executions.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit.router)
api_router.include_router(monitoring.router)
