import os
import sys
import bcrypt
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db
from core.rbac import create_access_token, get_current_user

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user_row = db.execute(text("SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = :email"), {"email": req.email}).mappings().first()
    
    if not user_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        
    user = dict(user_row)
    if not user.get("is_active"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is disabled")
        
    # Verify password using bcrypt directly
    password_hash = user.pop("password_hash")
    if not bcrypt.checkpw(req.password.encode('utf-8'), password_hash.encode('utf-8')):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        
    # Update last login
    db.execute(text("UPDATE users SET last_login = NOW() WHERE id = :user_id"), {"user_id": user["id"]})
    db.commit()
    
    # Generate JWT
    access_token = create_access_token(data={"user_id": user["id"], "role": user["role"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout():
    # Client-side handles clearing the token.
    return {"message": "Logged out successfully"}
