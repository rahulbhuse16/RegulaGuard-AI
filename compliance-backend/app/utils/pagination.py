from typing import Sequence, Type, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.schemas.common import Page

ModelT = TypeVar("ModelT")
SchemaT = TypeVar("SchemaT")


async def paginate(
    db: AsyncSession,
    stmt: Select,
    schema: Type[SchemaT],
    page: int = 1,
    page_size: int = 20,
) -> Page:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    result = await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))
    rows: Sequence = result.scalars().all()

    items = [schema.model_validate(row) for row in rows]
    return Page(items=items, page=page, page_size=page_size, total=total)
