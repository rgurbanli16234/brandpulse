"""Priority scoring.

score = 0.5 * severity + 0.3 * reach + 0.2 * velocity   (each normalized to 0..1)

Every factor is stored in a breakdown dict so the UI can explain "why this is High".
"""

from __future__ import annotations

import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import IncidentThread, Mention, as_utc, utcnow

# How much a topic amplifies severity (money/quality issues hurt more than price talk).
TOPIC_WEIGHT: dict[str, float] = {
    "Billing/Payment": 1.0,
    "Product Quality": 0.95,
    "Staff Behavior": 0.95,
    "Customer Service": 0.9,
    "Delivery/Shipping": 0.9,
    "Website/App Bug": 0.85,
    "Price": 0.7,
    "Other": 0.6,
}

WEIGHTS = {"severity": 0.5, "reach": 0.3, "velocity": 0.2}
REACH_CAP = 1_000_000  # followers+engagement that maps to reach = 1.0
VELOCITY_WINDOW_MINUTES = 60


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def tier_for_score(score: float) -> str:
    """Low < 0.25, Medium < 0.5, High < 0.75, Critical >= 0.75."""
    if score >= 0.75:
        return "Critical"
    if score >= 0.5:
        return "High"
    if score >= 0.25:
        return "Medium"
    return "Low"


def score_thread(thread: IncidentThread, mentions: list[Mention]) -> tuple[float, str, dict]:
    """Compute (score, tier, breakdown) for a thread and its mentions."""
    complaints = [m for m in mentions if m.is_complaint] or mentions

    # --- severity: strongest negativity in the thread, amplified by topic ---
    negativity = max((abs(min(m.sentiment_score or 0.0, 0.0)) for m in complaints), default=0.0)
    topic_weight = TOPIC_WEIGHT.get(thread.topic, 0.6)
    severity = _clamp(negativity * topic_weight)

    # --- reach: loudest author/engagement, log-scaled ---
    raw_reach = max((m.author_followers + m.engagement for m in mentions), default=0)
    reach = _clamp(math.log1p(raw_reach) / math.log1p(REACH_CAP))

    # --- velocity: mentions in the last 60 min vs the thread's baseline rate ---
    now = utcnow()
    recent = sum(
        1
        for m in mentions
        if (now - as_utc(m.created_at)).total_seconds() <= VELOCITY_WINDOW_MINUTES * 60
    )
    first_seen = min((as_utc(m.created_at) for m in mentions), default=now)
    age_hours = max((now - first_seen).total_seconds() / 3600.0, 1.0)
    baseline_per_hour = len(mentions) / age_hours
    expected = max(baseline_per_hour, 0.5)
    ratio = recent / expected
    velocity = _clamp((ratio - 1.0) / 4.0)

    score = round(
        WEIGHTS["severity"] * severity + WEIGHTS["reach"] * reach + WEIGHTS["velocity"] * velocity,
        4,
    )
    breakdown = {
        "score": score,
        "weights": WEIGHTS,
        "factors": {
            "severity": round(severity, 4),
            "reach": round(reach, 4),
            "velocity": round(velocity, 4),
        },
        "inputs": {
            "worst_negativity": round(negativity, 4),
            "topic_weight": topic_weight,
            "raw_reach": raw_reach,
            "recent_mentions_60m": recent,
            "baseline_per_hour": round(baseline_per_hour, 3),
            "mention_count": len(mentions),
        },
        "tier": tier_for_score(score),
    }
    return score, breakdown["tier"], breakdown


def score_threads(db: Session, business_id: int) -> list[tuple[IncidentThread, float, str, dict]]:
    """Score every thread of a business; propagate the result to its mentions."""
    threads = list(db.scalars(select(IncidentThread).where(IncidentThread.business_id == business_id)).all())
    scored: list[tuple[IncidentThread, float, str, dict]] = []
    for thread in threads:
        mentions = list(db.scalars(select(Mention).where(Mention.thread_id == thread.id)).all())
        if not mentions:
            continue
        score, tier, breakdown = score_thread(thread, mentions)
        thread.priority_tier = tier
        for mention in mentions:
            mention.priority_score = score
            mention.priority_tier = tier
            mention.score_breakdown_json = breakdown
        scored.append((thread, score, tier, breakdown))
    db.flush()
    return scored
