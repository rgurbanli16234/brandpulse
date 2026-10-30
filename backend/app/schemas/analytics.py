"""Analytics schemas."""

from __future__ import annotations

from pydantic import BaseModel


class SentimentPoint(BaseModel):
    date: str  # YYYY-MM-DD
    positive: int
    neutral: int
    negative: int
    strongly_negative: int
    total: int


class SentimentTrendOut(BaseModel):
    days: int
    points: list[SentimentPoint]


class TopicStat(BaseModel):
    topic: str
    count: int
    complaints: int
    avg_sentiment: float


class TopicsOut(BaseModel):
    total: int
    topics: list[TopicStat]


class SpikeOut(BaseModel):
    topic: str
    last_24h: int
    daily_average: float
    ratio: float
    detected: bool


class SpikesOut(BaseModel):
    window_hours: int
    lookback_days: int
    multiplier: float
    spikes: list[SpikeOut]


class SummaryOut(BaseModel):
    total_mentions: int
    mentions_24h: int
    complaints: int
    open_threads: int
    high_threads: int
    critical_threads: int
    unacknowledged_alerts: int
    avg_sentiment: float
    sentiment_distribution: dict[str, int]
    top_topics: list[TopicStat]
