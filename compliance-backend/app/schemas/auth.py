from pydantic import BaseModel, EmailStr

from app.core.security import Role


class RegisterRequest(BaseModel):
    organization_name: str
    email: str
    full_name: str
    password: str
    role: Role = Role.COMPLIANCE_ANALYST


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    organization_id: str
    email: str
    full_name: str
    role: Role

    class Config:
        from_attributes = True
