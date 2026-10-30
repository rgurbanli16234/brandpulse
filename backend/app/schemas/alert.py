"""Alert schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AlertOut(BaseModel):
    id: int
    thread_id: int
    thread_title: str | None = None
    tier: str
    summary: str
    channel: str
    sent_at: datetime
    acknowledged: bool
