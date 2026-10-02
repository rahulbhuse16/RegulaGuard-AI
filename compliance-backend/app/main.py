from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware

configure_logging()

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Agentic backend for banking regulatory compliance: ingestion, obligation "
        "extraction, control mapping, gap/risk analysis, remediation, impact "
        "analysis, simulation, cross-regulation intelligence, and contradiction "
        "detection -- all with source-cited, human-reviewable AI output."
    ),
    version="0.1.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT, "llm_provider": settings.LLM_PROVIDER}
