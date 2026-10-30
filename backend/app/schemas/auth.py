"""Auth schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    business_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    alert_email: EmailStr | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BusinessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    plan: str
    alert_email: str | None = None
    webhook_url: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    business: BusinessOut
