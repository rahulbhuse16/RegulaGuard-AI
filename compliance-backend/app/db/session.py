"""
Database engine and session management.

PostgreSQL is the sole system of record. Uses an async engine for
request-handling paths and exposes a FastAPI dependency for sessions.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(settings.ASYNC_DATABASE_URL, pool_pre_ping=True, future=True)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, expire_on_commit=False, autoflush=False, autocommit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
