"""Incident-thread schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from .mention import MentionOut

ThreadStatus = Literal["open", "investigating", "resolved"]


class ThreadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    topic: str
    first_seen: datetime
    last_seen: datetime
    mention_count: int
    priority_tier: str
    status: str


class ThreadDetailOut(ThreadOut):
    priority_score: float | None = None
    score_breakdown: dict | None = None
    mentions: list[MentionOut] = []


class ThreadStatusIn(BaseModel):
    status: ThreadStatus
