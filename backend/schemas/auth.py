"""
SupplySense API - Auth Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    """Credentials for username/password login."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    mfa_code: str | None = Field(None, pattern=r"^\d{6}$", description="6-digit TOTP code")

    model_config = {"json_schema_extra": {"example": {"email": "admin@supplysense.ai", "password": "SecurePass123!", "mfa_code": None}}}


class TokenResponse(BaseModel):
    """Response payload after successful authentication."""

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Seconds until access token expires")
    user: "UserResponse"

    model_config = {"json_schema_extra": {"example": {"access_token": "eyJ...", "refresh_token": "eyJ...", "token_type": "bearer", "expires_in": 1800}}}


class RefreshRequest(BaseModel):
    """Token refresh request."""

    refresh_token: str


class UserResponse(BaseModel):
    """Public user profile returned in API responses."""

    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    is_superuser: bool
    mfa_enabled: bool
    avatar_url: str | None = None
    department: str | None = None
    timezone: str = "UTC"
    last_login: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    """Update current user's profile."""

    full_name: str | None = Field(None, min_length=2, max_length=255)
    department: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    timezone: str | None = Field(None, max_length=50)
    avatar_url: str | None = None


class MFASetupResponse(BaseModel):
    """Response for MFA setup initiation."""

    secret: str
    qr_code_url: str
    backup_codes: list[str]
    issuer: str = "SupplySense"


class MFAVerifyRequest(BaseModel):
    """Verify a TOTP code to confirm MFA setup."""

    code: str = Field(pattern=r"^\d{6}$", description="6-digit TOTP code")
    secret: str


class InviteUserRequest(BaseModel):
    """Admin invite a new user."""

    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    role: str
    department: str | None = None
    send_email: bool = True

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid_roles = [
            "viewer", "analyst", "planner",
            "procurement_manager", "supply_chain_manager",
            "auditor", "admin", "superadmin",
        ]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {valid_roles}")
        return v


class ChangePasswordRequest(BaseModel):
    """Change user password."""

    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class OAuthStateResponse(BaseModel):
    """OAuth2 redirect response."""

    authorization_url: str
    state: str
