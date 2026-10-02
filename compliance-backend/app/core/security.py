"""
Authentication and authorization primitives.

- Password hashing via passlib/bcrypt
- JWT access/refresh tokens via PyJWT
- Role-based access control dependency factory
"""
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Iterable, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


class Role(str, Enum):
    COMPLIANCE_ANALYST = "COMPLIANCE_ANALYST"
    COMPLIANCE_MANAGER = "COMPLIANCE_MANAGER"
    AUDITOR = "AUDITOR"
    ADMIN = "ADMIN"


class TokenPayload(BaseModel):
    sub: str  # user id
    org_id: str
    role: Role
    type: str  # "access" | "refresh"
    exp: datetime
    jti: str


class CurrentUser(BaseModel):
    id: str
    org_id: str
    role: Role


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(subject: str, org_id: str, role: Role, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "org_id": org_id,
        "role": role.value,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, org_id: str, role: Role) -> str:
    return _create_token(
        subject, org_id, role, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(subject: str, org_id: str, role: Role) -> str:
    return _create_token(
        subject, org_id, role, "refresh", timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type")
    return CurrentUser(id=payload["sub"], org_id=payload["org_id"], role=Role(payload["role"]))


def require_roles(*allowed: Role):
    """Dependency factory enforcing RBAC on a route."""

    def _dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {user.role.value} is not permitted to perform this action",
            )
        return user

    return _dependency


def any_authenticated(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    return user
