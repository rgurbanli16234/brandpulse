"""Spike detection.

Compares a topic's recent volume against its normal rate: the last
``window_hours`` (default 24h) versus the daily average of the preceding
``lookback_days`` (default 7). A topic is flagged when the recent count is at
least ``multiplier`` times the baseline (default 2x) and has at least two
mentions, so a single stray post can't look like an outbreak.
"""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Mention, as_utc, utcnow

MIN_RECENT = 2  # never flag a spike on one mention


def detect_spikes(
    db: Session,
    business_id: int,
    window_hours: int = 24,
    lookback_days: int = 7,
    multiplier: float | None = None,
) -> list[dict]:
    """Return per-topic volume vs baseline, sorted by how far above normal they are."""
    if multiplier is None:
        multiplier = get_settings().spike_multiplier

    now = utcnow()
    window_start = now - timedelta(hours=window_hours)
    lookback_start = window_start - timedelta(days=lookback_days)

    mentions = db.scalars(
        select(Mention).where(
            Mention.business_id == business_id,
            Mention.created_at >= lookback_start,
        )
    ).all()

    recent: dict[str, int] = {}
    baseline: dict[str, int] = {}
    for mention in mentions:
        topic = mention.topic or "Other"
        bucket = recent if as_utc(mention.created_at) >= window_start else baseline
        bucket[topic] = bucket.get(topic, 0) + 1

    results: list[dict] = []
    for topic in set(recent) | set(baseline):
        last_window = recent.get(topic, 0)
        daily_average = baseline.get(topic, 0) / lookback_days
        if daily_average > 0:
            ratio = last_window / daily_average
        else:
            ratio = float(last_window)
        results.append(
            {
                "topic": topic,
                "last_24h": last_window,
                "daily_average": round(daily_average, 3),
                "ratio": round(ratio, 2),
                "detected": last_window >= MIN_RECENT and ratio >= multiplier,
            }
        )

    results.sort(key=lambda row: (row["detected"], row["ratio"]), reverse=True)
    return results
