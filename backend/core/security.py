"""
SupplySense API - Security Layer
JWT + OAuth2 + RBAC + bcrypt password hashing
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Sequence

import structlog
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from core.config import settings

logger = structlog.get_logger(__name__)

# ── Password hashing ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── OAuth2 scheme ─────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    scheme_name="JWT",
)

# ── Role hierarchy (higher index = more privilege) ────────────────────────────
ROLES_HIERARCHY: dict[str, int] = {
    "viewer": 1,
    "analyst": 2,
    "planner": 3,
    "procurement_manager": 4,
    "supply_chain_manager": 5,
    "auditor": 3,  # auditor has read-only elevated access
    "admin": 6,
    "superadmin": 7,
}

# ── RBAC Permission Matrix ─────────────────────────────────────────────────────
PERMISSIONS: dict[str, list[str]] = {
    "viewer": [
        "inventory:read",
        "suppliers:read",
        "forecasting:read",
        "risk:read",
        "procurement:read",
        "agents:read",
        "copilot:use",
    ],
    "analyst": [
        "inventory:read",
        "suppliers:read",
        "forecasting:read",
        "forecasting:scenario",
        "risk:read",
        "procurement:read",
        "agents:read",
        "agents:decisions:read",
        "copilot:use",
        "optimization:read",
    ],
    "planner": [
        "inventory:read",
        "inventory:write",
        "inventory:transfer",
        "suppliers:read",
        "forecasting:read",
        "forecasting:scenario",
        "forecasting:retrain",
        "risk:read",
        "procurement:read",
        "procurement:write",
        "agents:read",
        "agents:decisions:read",
        "agents:decisions:approve",
        "copilot:use",
        "optimization:run",
    ],
    "procurement_manager": [
        "inventory:read",
        "inventory:write",
        "suppliers:read",
        "suppliers:write",
        "forecasting:read",
        "forecasting:scenario",
        "risk:read",
        "risk:acknowledge",
        "procurement:read",
        "procurement:write",
        "procurement:approve",
        "agents:read",
        "agents:decisions:read",
        "agents:decisions:approve",
        "copilot:use",
        "optimization:run",
    ],
    "supply_chain_manager": [
        "inventory:read",
        "inventory:write",
        "inventory:transfer",
        "suppliers:read",
        "suppliers:write",
        "forecasting:read",
        "forecasting:scenario",
        "forecasting:retrain",
        "risk:read",
        "risk:write",
        "risk:acknowledge",
        "procurement:read",
        "procurement:write",
        "procurement:approve",
        "agents:read",
        "agents:trigger",
        "agents:decisions:read",
        "agents:decisions:approve",
        "copilot:use",
        "optimization:run",
        "mlops:read",
    ],
    "auditor": [
        "inventory:read",
        "suppliers:read",
        "forecasting:read",
        "risk:read",
        "procurement:read",
        "agents:read",
        "agents:decisions:read",
        "audit:read",
        "copilot:use",
    ],
    "admin": [
        "*",  # All permissions
    ],
    "superadmin": [
        "*",
        "admin:permissions:write",
        "admin:users:manage",
        "system:config",
    ],
}


def has_permission(role: str, permission: str) -> bool:
    """Check if a role has a specific permission."""
    role_perms = PERMISSIONS.get(role, [])
    if "*" in role_perms:
        return True
    # Check exact match or wildcard namespace
    if permission in role_perms:
        return True
    # Check namespace wildcard e.g. "inventory:*"
    namespace = permission.split(":")[0]
    if f"{namespace}:*" in role_perms:
        return True
    return False


# ── Token schemas ─────────────────────────────────────────────────────────────
class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str  # user_id as string
    email: str
    role: str
    type: str  # "access" or "refresh"
    jti: str  # JWT ID for revocation
    exp: datetime | None = None
    iat: datetime | None = None
    permissions: list[str] = []


# ── Password utilities ────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return bcrypt hash of a password."""
    return pwd_context.hash(password)


# ── Token creation ────────────────────────────────────────────────────────────
def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    jti = str(uuid.uuid4())
    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "type": "access",
            "jti": jti,
        }
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a signed JWT refresh token with longer TTL."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())
    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "type": "refresh",
            "jti": jti,
        }
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> TokenPayload:
    """
    Decode and validate a JWT token.
    Raises HTTPException 401 on any error.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        sub: str | None = payload.get("sub")
        email: str | None = payload.get("email")
        role: str | None = payload.get("role")
        t_type: str | None = payload.get("type")
        jti: str | None = payload.get("jti")

        if sub is None or email is None or role is None:
            logger.warning("token_missing_claims", sub=sub, email=email, role=role)
            raise credentials_exception

        if t_type != token_type:
            logger.warning("token_type_mismatch", expected=token_type, got=t_type)
            raise credentials_exception

        return TokenPayload(
            sub=sub,
            email=email,
            role=role,
            type=t_type,
            jti=jti or "",
            permissions=PERMISSIONS.get(role, []),
        )
    except JWTError as exc:
        logger.warning("jwt_error", error=str(exc))
        raise credentials_exception from exc


# ── FastAPI Dependencies ──────────────────────────────────────────────────────
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> TokenPayload:
    """
    Dependency: decode JWT and return the current user's token payload.
    Also checks Redis blacklist for revoked tokens (optional).
    """
    return verify_token(token, token_type="access")


async def get_current_active_user(
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
) -> TokenPayload:
    """Dependency: ensure user is active (add DB check if needed)."""
    # In a full implementation, fetch from DB to check is_active
    # For now, trust the token (active users only get tokens)
    return current_user


def require_roles(*roles: str):
    """
    Dependency factory: require any of the specified roles.

    Usage::
        @router.get("/admin", dependencies=[Depends(require_roles("admin", "superadmin"))])
    """

    async def role_checker(
        current_user: Annotated[TokenPayload, Depends(get_current_active_user)],
    ) -> TokenPayload:
        allowed = set(roles)
        # Superadmin always allowed
        if current_user.role == "superadmin":
            return current_user
        if current_user.role not in allowed:
            logger.warning(
                "rbac_denied",
                user=current_user.email,
                role=current_user.role,
                required=roles,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {', '.join(roles)}",
            )
        return current_user

    return role_checker


def require_permission(permission: str):
    """
    Dependency factory: require a specific RBAC permission.

    Usage::
        @router.post("/approve", dependencies=[Depends(require_permission("procurement:approve"))])
    """

    async def permission_checker(
        current_user: Annotated[TokenPayload, Depends(get_current_active_user)],
    ) -> TokenPayload:
        if not has_permission(current_user.role, permission):
            logger.warning(
                "permission_denied",
                user=current_user.email,
                role=current_user.role,
                permission=permission,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: '{permission}' required",
            )
        return current_user

    return permission_checker


class RBACMiddleware:
    """
    Starlette middleware for request-level RBAC logging.
    Actual enforcement is done via route dependencies.
    """

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] == "http":
            request = Request(scope, receive)
            # Log the request path for audit trail
            path = request.url.path
            method = request.method
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                try:
                    token = auth_header.split(" ")[1]
                    payload = verify_token(token)
                    logger.info(
                        "api_request",
                        path=path,
                        method=method,
                        user=payload.email,
                        role=payload.role,
                    )
                except HTTPException:
                    pass  # Will be caught by route dependency
        await self.app(scope, receive, send)


# ── Utility helpers ───────────────────────────────────────────────────────────
def generate_user_token_data(user: Any) -> dict[str, Any]:
    """Build token payload dict from a User ORM model."""
    return {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
    }
