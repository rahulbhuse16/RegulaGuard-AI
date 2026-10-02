"""
Global FastAPI exception handling. Ensures every error response has a
consistent shape and never leaks stack traces.
"""
import uuid

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.logging import get_logger

logger = get_logger(__name__)


def _error_body(code: str, message: str, request_id: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details, "request_id": request_id}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(code=f"HTTP_{exc.status_code}", message=str(exc.detail), request_id=request_id),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(
                code="VALIDATION_ERROR",
                message="Request validation failed",
                request_id=request_id,
                details={"errors": exc.errors()},
            ),
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.warning("db_integrity_error", request_id=request_id, error=str(exc.orig))
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_error_body(code="CONFLICT", message="The request conflicts with existing data", request_id=request_id),
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error("db_error", request_id=request_id, error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(code="DATABASE_ERROR", message="A database error occurred", request_id=request_id),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error("unhandled_exception", request_id=request_id, error=str(exc), error_type=type(exc).__name__)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(code="INTERNAL_ERROR", message="An unexpected error occurred", request_id=request_id),
        )
