"""Instant analysis endpoint (used by the Analyze Playground)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..analyzers import get_analyzer
from ..models import User
from ..schemas.analyze import AnalyzeIn, AnalyzeOut
from .deps import get_current_user

router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeOut)
def analyze(payload: AnalyzeIn, _user: User = Depends(get_current_user)) -> AnalyzeOut:
    """Analyze a single piece of text with the configured analyzer."""
    result = get_analyzer().analyze(payload.text)
    return AnalyzeOut(
        sentiment_label=result.sentiment_label,
        sentiment_score=result.sentiment_score,
        is_complaint=result.is_complaint,
        topic=result.topic,
        language=result.language,
    )
