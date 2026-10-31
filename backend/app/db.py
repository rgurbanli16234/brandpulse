"""Database engine, session factory and declarative base."""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()

_IS_SQLITE = settings.database_url.startswith("sqlite")

# SQLite needs check_same_thread=False to be used across threads (APScheduler jobs).
# timeout=30 makes a concurrent writer wait for the lock instead of failing at once
# with "database is locked" when the demo seed and a request overlap.
_connect_args: dict[str, object] = (
    {"check_same_thread": False, "timeout": 30} if _IS_SQLITE else {}
)

engine = create_engine(settings.database_url, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sqlite_file_path(database_url: str) -> Path | None:
    """Return the on-disk path for a file-based SQLite URL, or None for in-memory."""
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return None
    raw = database_url[len(prefix) :]
    if not raw or raw.startswith(":memory:"):
        return None
    return Path(raw)


def init_db() -> None:
    """Create the database directory and tables if they do not exist."""
    path = sqlite_file_path(settings.database_url)
    if path is not None:
        # A missing parent directory makes SQLite fail with "unable to open
        # database file" on the first write; create it up front.
        path.parent.mkdir(parents=True, exist_ok=True)

    from . import models  # noqa: F401  (ensure models are imported before create_all)

    Base.metadata.create_all(bind=engine)
