"""One-shot demo seeding for hosted deployments.

A Space's disk is ephemeral, so every cold start can begin with an empty database.
``seed_demo_if_empty`` creates a demo business + owner, a few starter keywords and
~300 EN/AZ/RU mentions (with two viral clusters and one fresh spike), then runs the
full pipeline so the dashboard, threads and alerts all have something to show.
"""

from __future__ import annotations

import logging
import threading

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import Business, Keyword, User
from ..security import hash_password
from ..services.pipeline import add_mention, run_pipeline
from .generator import generate_mentions

logger = logging.getLogger(__name__)

# Serialises the check-then-insert so a concurrent seed cannot create a second
# demo business (the auto-seed thread and a startup race are the realistic cases).
_SEED_LOCK = threading.Lock()

# Public demo credentials shown in DEPLOY.md; change them for anything real.
DEMO_BUSINESS = "Demo Coffee Co."
DEMO_EMAIL = "demo@brandpulse.app"
DEMO_PASSWORD = "demo1234"
DEMO_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("brandpulse", "brand"),
    ("demo coffee", "brand"),
    ("cold brew", "product"),
)


def seed_demo_if_empty(db: Session) -> bool:
    """Seed demo data when no business exists yet. Returns True when it seeded.

    Safe to call from several threads: the check-then-insert runs under a lock and
    a unique-constraint violation is treated as "already seeded".
    """
    with _SEED_LOCK:
        try:
            return _seed_demo_unlocked(db)
        except IntegrityError:
            db.rollback()
            logger.info("Demo data was seeded concurrently; skipping.")
            return False


def _seed_demo_unlocked(db: Session) -> bool:
    if db.scalar(select(func.count()).select_from(Business)):
        return False

    business = Business(name=DEMO_BUSINESS, plan="free")
    db.add(business)
    db.flush()

    db.add(
        User(
            business_id=business.id,
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
        )
    )
    for term, kind in DEMO_KEYWORDS:
        db.add(Keyword(business_id=business.id, term=term, type=kind))
    db.flush()

    created = 0
    for row in generate_mentions():
        if add_mention(db, business.id, **row) is not None:
            created += 1

    pipeline = run_pipeline(db, business.id)
    logger.info("Seeded demo data: %s mention(s), pipeline=%s", created, pipeline)
    return True
