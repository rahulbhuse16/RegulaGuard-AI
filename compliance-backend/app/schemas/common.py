from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    page: int
    page_size: int
    total: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
    request_id: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
