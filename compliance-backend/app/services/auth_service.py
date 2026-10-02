import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.identity import Organization, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


async def register_user(db: AsyncSession, payload: RegisterRequest) -> User:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists")

    org_result = await db.execute(select(Organization).where(Organization.name == payload.organization_name))
    organization = org_result.scalar_one_or_none()
    if organization is None:
        organization = Organization(name=payload.organization_name)
        db.add(organization)
        await db.flush()

    user = User(
        organization_id=organization.id,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, payload: LoginRequest) -> User:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")
    return user


def issue_tokens(user: User) -> TokenResponse:
    from app.core.security import Role

    role = Role(user.role.value) if hasattr(user.role, "value") else Role(user.role)
    access = create_access_token(str(user.id), str(user.organization_id), role)
    refresh = create_refresh_token(str(user.id), str(user.organization_id), role)
    return TokenResponse(access_token=access, refresh_token=refresh)
