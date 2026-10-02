from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit_event
from app.core.security import CurrentUser, decode_token, get_current_user
from app.db.session import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, issue_tokens, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(db, payload)
    await record_audit_event(
        db,
        organization_id=user.organization_id,
        event_type="USER_REGISTERED",
        actor_user_id=user.id,
        entity_type="User",
        entity_id=user.id,
    )
    await db.commit()
    return UserResponse(
        id=str(user.id),
        organization_id=str(user.organization_id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, payload)
    tokens = issue_tokens(user)
    await record_audit_event(
        db, organization_id=user.organization_id, event_type="LOGIN", actor_user_id=user.id
    )
    await db.commit()
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str):
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type")
    from app.core.security import Role, create_access_token, create_refresh_token

    role = Role(payload["role"])
    access = create_access_token(payload["sub"], payload["org_id"], role)
    new_refresh = create_refresh_token(payload["sub"], payload["org_id"], role)
    return TokenResponse(access_token=access, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    import uuid as _uuid

    from app.models.identity import User

    user = await db.get(User, _uuid.UUID(current_user.id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(
        id=str(user.id),
        organization_id=str(user.organization_id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )
