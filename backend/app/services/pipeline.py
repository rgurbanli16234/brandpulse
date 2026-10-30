"""Ingestion pipeline: ingest -> analyze -> cluster -> score -> alerts.

Idempotent: mentions are deduplicated by external_id / content hash, only unclustered
complaints are clustered, and alerting is rate-limited per thread.
"""

from __future__ import annotations

import hashlib
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..analyzers import get_analyzer
from ..models import Business, Mention, as_utc, utcnow
from .alerts import create_alerts
from .clustering import cluster_new_complaints
from .scoring import score_threads


def content_hash(text: str) -> str:
    return hashlib.sha256(" ".join(text.lower().split()).encode("utf-8")).hexdigest()


def add_mention(
    db: Session,
    business_id: int,
    *,
    text: str,
    source: str = "manual",
    author: str | None = None,
    author_followers: int = 0,
    url: str | None = None,
    created_at: datetime | None = None,
    engagement: int = 0,
    external_id: str | None = None,
    language: str | None = None,
) -> Mention | None:
    """Analyze and store a mention. Returns None when it is a duplicate."""
    text = " ".join((text or "").split())
    if not text:
        return None

    if external_id:
        duplicate = db.scalar(
            select(Mention).where(Mention.business_id == business_id, Mention.external_id == external_id)
        )
        if duplicate:
            return None

    digest = content_hash(text)
    if db.scalar(select(Mention).where(Mention.business_id == business_id, Mention.content_hash == digest)):
        return None

    result = get_analyzer().analyze(text)
    mention = Mention(
        business_id=business_id,
        source=source,
        external_id=external_id,
        content_hash=digest,
        author=author,
        author_followers=_clamp_followers(author_followers),
        text=text,
        url=url,
        language=language or result.language,
        created_at=created_at or utcnow(),
        engagement=engagement,
        sentiment_label=result.sentiment_label,
        sentiment_score=result.sentiment_score,
        is_complaint=result.is_complaint,
        topic=result.topic,
    )
    db.add(mention)
    return mention


def _clamp_followers(value: int) -> int:
    """Clamp follower counts to a sane, non-negative range."""
    return max(0, int(value or 0))


def analyze_pending(db: Session, business_id: int) -> int:
    """Analyze any mentions that still have no sentiment (safety net)."""
    pending = list(
        db.scalars(
            select(Mention).where(
                Mention.business_id == business_id, Mention.sentiment_label.is_(None)
            )
        ).all()
    )
    for mention in pending:
        result = get_analyzer().analyze(mention.text)
        mention.sentiment_label = result.sentiment_label
        mention.sentiment_score = result.sentiment_score
        mention.is_complaint = result.is_complaint
        mention.topic = result.topic
        mention.language = mention.language or result.language
    db.flush()
    return len(pending)


def run_pipeline(db: Session, business_id: int) -> dict[str, int]:
    """Run the full pipeline for one business and return per-stage counts."""
    db.flush()  # make any just-added mentions visible to the queries below
    business = db.get(Business, business_id)
    analyzed = analyze_pending(db, business_id)
    clustered = cluster_new_complaints(db, business_id)
    scored = score_threads(db, business_id)
    alerts = create_alerts(db, business, scored) if business else 0
    db.commit()
    return {
        "analyzed": analyzed,
        "clustered": clustered,
        "scored_threads": len(scored),
        "alerts": alerts,
    }
