import os
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db

SECRET_KEY = os.getenv("JWT_SECRET", "super_secret_supplysense_jwt_key_2026")
ALGORITHM = "HS256"

security = HTTPBearer()

ROLE_PERMISSIONS = {
    'super_admin': ['*'],
    'admin': ['dashboard:rw', 'forecast:rw', 'inventory:rw',
              'procurement:rw', 'suppliers:rw', 'risk:rw',
              'analytics:rw', 'decisions:rw', 'admin:r'],
    'procurement_manager': ['dashboard:r', 'forecast:r',
              'inventory:r', 'procurement:rw', 'suppliers:rw',
              'risk:r', 'analytics:r', 'decisions:r'],
    'warehouse_manager': ['dashboard:r', 'inventory:rw',
              'warehouse:rw', 'risk:r', 'analytics:r'],
    'forecast_analyst': ['dashboard:r', 'forecast:rw',
              'mlops:rw', 'explainability:rw', 'analytics:rw',
              'risk:rw'],
    'viewer': ['dashboard:r', 'forecast:r', 'inventory:r',
              'procurement:r', 'suppliers:r', 'risk:r',
              'analytics:r'],
    'auditor': ['decisions:r', 'audit:r', 'alerts:r']
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.execute(text("SELECT id, email, full_name, role FROM users WHERE id = :user_id"), {"user_id": user_id}).mappings().first()
    if user is None:
        raise credentials_exception
    return dict(user)

def check_permission(user_role: str, required_permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(user_role, [])
    if '*' in perms:
        return True
    return required_permission in perms

class RequirePermission:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
        
    def __call__(self, user: dict = Depends(get_current_user)):
        if not check_permission(user['role'], self.required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {user['role']} does not have permission {self.required_permission}"
            )
        return user

# Helper dependency instance maker
def require_permission(permission: str):
    return Depends(RequirePermission(permission))
