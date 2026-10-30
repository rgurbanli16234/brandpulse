"""Schemas for the /analyze endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AnalyzeIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class AnalyzeOut(BaseModel):
    sentiment_label: str
    sentiment_score: float
    is_complaint: bool
    topic: str
    language: str
