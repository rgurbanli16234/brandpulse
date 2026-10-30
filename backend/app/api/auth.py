"""Authentication endpoints: register + login."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Business, User
from ..schemas.auth import LoginIn, RegisterIn, TokenOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User, business: Business) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user.id, business.id),
        user=user,
        business=business,
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> TokenOut:
    """Create a business plus its first (owner) user and return a token."""
    exists = db.scalar(select(User).where(User.email == payload.email.lower()))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    business = Business(
        name=payload.business_name.strip(),
        alert_email=str(payload.alert_email) if payload.alert_email else None,
    )
    db.add(business)
    db.flush()

    user = User(
        business_id=business.id,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(business)
    return _token_response(user, business)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    """Authenticate an existing user."""
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    business = db.get(Business, user.business_id)
    if business is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _token_response(user, business)
