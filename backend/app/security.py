"""Password hashing (PBKDF2, stdlib only) and JWT helpers."""

import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from .config import get_settings

_ITERATIONS = 200_000
_ALGO = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    """Return a salted PBKDF2 hash string: algo$iterations$salt$hash (base64)."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _ITERATIONS)
    return f"{_ALGO}${_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time verification of a password against a stored hash."""
    try:
        algo, iterations, salt_b64, hash_b64 = hashed.split("$")
        if algo != _ALGO:
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
    except (ValueError, TypeError):
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    return hmac.compare_digest(digest, expected)


def create_access_token(user_id: int, business_id: int) -> str:
    """Create a signed JWT carrying the user and business id."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "business_id": business_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a JWT; returns the payload or None when invalid/expired."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
