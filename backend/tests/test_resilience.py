"""Regression tests for the startup / transport bugs fixed in this pass.

Each test pins one behaviour that was broken or missing before:
  * /health must reflect the database, not just the process;
  * a missing SQLite directory must be created instead of crashing;
  * production must refuse an insecure JWT secret and must not inherit the
    development CORS regex;
  * one failing tenant must not abort a scheduler tick;
  * the startup demo seed must be idempotent.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, select

from app import db as db_module
from app import main as main_module
from app.config import DEV_CORS_ORIGIN_REGEX, DEV_JWT_SECRET, Settings
from app.models import Business
from app.seed.startup import seed_demo_if_empty
from app.services import scheduler as scheduler_module

API = "/api/v1"
STRONG_SECRET = "a-very-long-random-production-secret-0123456789"


# --------------------------------------------------------------------------- /health
def test_health_reports_the_database(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["environment"]
    assert body["analyzer"]


def test_health_returns_503_when_the_database_is_unreachable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A broken database must fail the health check instead of reporting "ok"."""

    class _BrokenEngine:
        def connect(self):
            raise RuntimeError("database is gone")

    monkeypatch.setattr(main_module, "engine", _BrokenEngine())
    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["status"] == "error"
    assert response.json()["database"] == "unreachable"


# --------------------------------------------------------------------------- SQLite path
@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("sqlite:////app/data/brandpulse.db", Path("/app/data/brandpulse.db")),
        ("sqlite:///./brandpulse.db", Path("./brandpulse.db")),
        ("sqlite:///:memory:", None),
        ("postgresql://user:pw@host/db", None),
    ],
)
def test_sqlite_file_path_parsing(url: str, expected: Path | None) -> None:
    assert db_module.sqlite_file_path(url) == expected


def test_init_db_creates_a_missing_directory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Pointing DATABASE_URL at a missing folder must not crash on first write."""
    db_file = tmp_path / "nested" / "deeper" / "brandpulse.db"
    url = f"sqlite:///{db_file.as_posix()}"

    monkeypatch.setattr(db_module.settings, "database_url", url)
    monkeypatch.setattr(
        db_module,
        "engine",
        create_engine(url, connect_args={"check_same_thread": False}, future=True),
    )
    assert not db_file.parent.exists()

    db_module.init_db()

    assert db_file.exists(), "init_db should create the database directory and tables"


# --------------------------------------------------------------------------- production guards
def test_production_rejects_the_development_jwt_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", jwt_secret=DEV_JWT_SECRET)


def test_production_rejects_a_short_jwt_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", jwt_secret="too-short")


def test_production_accepts_a_long_random_jwt_secret() -> None:
    settings = Settings(environment="production", jwt_secret=STRONG_SECRET)
    assert settings.is_production is True


def test_development_does_not_reject_the_default_secret() -> None:
    # The dev config must keep booting without a JWT_SECRET (conftest sets one, so
    # assert on the guard's outcome rather than on the environment-injected value).
    assert Settings(environment="development").is_production is False


def test_production_does_not_inherit_the_development_cors_regex() -> None:
    production = Settings(environment="production", jwt_secret=STRONG_SECRET)
    assert production.effective_cors_origin_regex is None

    development = Settings(environment="development")
    assert development.effective_cors_origin_regex == DEV_CORS_ORIGIN_REGEX


def test_production_honours_an_explicit_cors_regex() -> None:
    settings = Settings(
        environment="production",
        jwt_secret=STRONG_SECRET,
        cors_origin_regex=r"https://app\.example\.com",
    )
    assert settings.effective_cors_origin_regex == r"https://app\.example\.com"


# --------------------------------------------------------------------------- scheduler
def test_scheduler_tick_survives_a_failing_business(
    client: TestClient, auth: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    """One exploding tenant must not abort the whole tick."""

    def _boom(*_args, **_kwargs):
        raise RuntimeError("source connector exploded")

    monkeypatch.setattr(scheduler_module, "sync_business_sources", _boom)

    result = scheduler_module.run_scheduled_sync()

    assert result["businesses"] >= 1
    assert result["mentions"] == 0


# --------------------------------------------------------------------------- demo seed
def test_seed_demo_is_idempotent(db) -> None:
    """The AUTO_SEED path must seed once and then report "already seeded"."""
    assert seed_demo_if_empty(db) is True
    assert seed_demo_if_empty(db) is False
    assert db.scalar(select(Business).limit(1)) is not None


def test_seed_demo_skips_when_a_business_already_exists(db, auth: dict[str, str]) -> None:
    # ``auth`` registers a business, so the demo seed must be a no-op.
    assert seed_demo_if_empty(db) is False
