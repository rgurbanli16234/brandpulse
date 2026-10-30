"""Mention schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ManualMentionIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    author: str | None = None
    author_followers: int = 0
    url: str | None = None
    engagement: int = 0
    created_at: datetime | None = None


class MentionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    author: str | None = None
    author_followers: int
    text: str
    url: str | None = None
    language: str
    created_at: datetime
    engagement: int
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    is_complaint: bool
    topic: str | None = None
    thread_id: int | None = None
    priority_score: float | None = None
    priority_tier: str | None = None


class CsvUploadOut(BaseModel):
    imported: int
    skipped: int
    pipeline: dict[str, int]
