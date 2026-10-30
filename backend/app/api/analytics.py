"""Analytics endpoints: KPI summary, sentiment trend, topic breakdown and spikes."""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Alert, IncidentThread, Mention, User, as_utc, utcnow
from ..schemas.analytics import (
    SentimentPoint,
    SentimentTrendOut,
    SpikeOut,
    SpikesOut,
    SummaryOut,
    TopicStat,
    TopicsOut,
)
from ..services.spikes import detect_spikes
from .deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

_SENTIMENTS = ("positive", "neutral", "negative", "strongly_negative")


def _topic_stats(mentions: list[Mention], limit: int | None = None) -> list[TopicStat]:
    counts: dict[str, int] = defaultdict(int)
    complaints: dict[str, int] = defaultdict(int)
    sentiment_sum: dict[str, float] = defaultdict(float)
    for mention in mentions:
        topic = mention.topic or "Other"
        counts[topic] += 1
        if mention.is_complaint:
            complaints[topic] += 1
        sentiment_sum[topic] += mention.sentiment_score or 0.0
    stats = [
        TopicStat(
            topic=topic,
            count=count,
            complaints=complaints[topic],
            avg_sentiment=round(sentiment_sum[topic] / count, 3),
        )
        for topic, count in counts.items()
    ]
    stats.sort(key=lambda s: (s.count, s.complaints), reverse=True)
    return stats[:limit] if limit else stats


@router.get("/summary", response_model=SummaryOut)
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SummaryOut:
    """Headline KPIs for the dashboard."""
    business_id = user.business_id
    now = utcnow()
    mentions = db.scalars(select(Mention).where(Mention.business_id == business_id)).all()

    distribution: dict[str, int] = {label: 0 for label in _SENTIMENTS}
    sentiment_total = 0.0
    mentions_24h = 0
    complaints = 0
    for mention in mentions:
        label = mention.sentiment_label or "neutral"
        distribution[label] = distribution.get(label, 0) + 1
        sentiment_total += mention.sentiment_score or 0.0
        if as_utc(mention.created_at) >= now - timedelta(hours=24):
            mentions_24h += 1
        if mention.is_complaint:
            complaints += 1

    open_threads = db.scalar(
        select(func.count())
        .select_from(IncidentThread)
        .where(IncidentThread.business_id == business_id, IncidentThread.status != "resolved")
    )
    high_threads = db.scalar(
        select(func.count())
        .select_from(IncidentThread)
        .where(IncidentThread.business_id == business_id, IncidentThread.priority_tier == "High")
    )
    critical_threads = db.scalar(
        select(func.count())
        .select_from(IncidentThread)
        .where(IncidentThread.business_id == business_id, IncidentThread.priority_tier == "Critical")
    )
    unack_alerts = db.scalar(
        select(func.count())
        .select_from(Alert)
        .join(IncidentThread, Alert.thread_id == IncidentThread.id)
        .where(IncidentThread.business_id == business_id, Alert.acknowledged.is_(False))
    )

    return SummaryOut(
        total_mentions=len(mentions),
        mentions_24h=mentions_24h,
        complaints=complaints,
        open_threads=open_threads or 0,
        high_threads=high_threads or 0,
        critical_threads=critical_threads or 0,
        unacknowledged_alerts=unack_alerts or 0,
        avg_sentiment=round(sentiment_total / len(mentions), 3) if mentions else 0.0,
        sentiment_distribution=distribution,
        top_topics=_topic_stats(mentions, limit=5),
    )


@router.get("/sentiment-trend", response_model=SentimentTrendOut)
def sentiment_trend(
    days: int = Query(default=14, ge=1, le=90),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SentimentTrendOut:
    """Daily sentiment counts for the last ``days`` days (continuous, zero-filled)."""
    now = utcnow()
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    mentions = db.scalars(
        select(Mention).where(Mention.business_id == user.business_id, Mention.created_at >= start)
    ).all()

    buckets: dict[str, dict[str, int]] = {
        (start + timedelta(days=offset)).date().isoformat(): dict.fromkeys(_SENTIMENTS, 0)
        for offset in range(days)
    }
    for mention in mentions:
        key = as_utc(mention.created_at).date().isoformat()
        bucket = buckets.get(key)
        if bucket is None:
            continue
        label = mention.sentiment_label or "neutral"
        bucket[label] = bucket.get(label, 0) + 1

    points = [
        SentimentPoint(date=date, total=sum(counts.values()), **counts)
        for date, counts in sorted(buckets.items())
    ]
    return SentimentTrendOut(days=days, points=points)


@router.get("/topics", response_model=TopicsOut)
def topics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TopicsOut:
    """Mention volume per topic with the complaint share and average sentiment."""
    mentions = db.scalars(select(Mention).where(Mention.business_id == user.business_id)).all()
    return TopicsOut(total=len(mentions), topics=_topic_stats(mentions))


@router.get("/spikes", response_model=SpikesOut)
def spikes(
    window_hours: int = Query(default=24, ge=1, le=168),
    lookback_days: int = Query(default=7, ge=1, le=60),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpikesOut:
    """Topics whose recent volume is far above their baseline."""
    rows = detect_spikes(db, user.business_id, window_hours=window_hours, lookback_days=lookback_days)
    return SpikesOut(
        window_hours=window_hours,
        lookback_days=lookback_days,
        multiplier=get_settings().spike_multiplier,
        spikes=[SpikeOut(**row) for row in rows],
    )
