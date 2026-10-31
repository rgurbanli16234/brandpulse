"""Shared pytest fixtures.

The test database URL and the scheduler flag have to be set *before* ``app`` is
imported, because ``app.db`` builds the engine at import time.
"""

from __future__ import annotations

import os
import sys
import tempfile
from collections.abc import Iterator
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_TMP_DIR = Path(tempfile.mkdtemp(prefix="brandpulse-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TMP_DIR / 'test.db').as_posix()}"
os.environ["ENABLE_SCHEDULER"] = "false"
os.environ["ANALYZER"] = "rules"
os.environ["JWT_SECRET"] = "test-secret-only-for-the-test-suite-0123456789"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

DEFAULT_PASSWORD = "s3cret-password"


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    """A TestClient with the app lifespan (init_db + scheduler) applied."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def clean_db() -> Iterator[None]:
    """Give every test a fresh, empty schema."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db() -> Iterator[Session]:
    """A direct database session for service-level tests."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def register_business(
    client: TestClient,
    email: str = "owner@example.com",
    business_name: str = "Acme Coffee",
) -> dict[str, str]:
    """Register a business owner and return auth headers."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": DEFAULT_PASSWORD,
            "business_name": business_name,
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def auth(client: TestClient) -> dict[str, str]:
    """Auth headers for a freshly registered business."""
    return register_business(client)
