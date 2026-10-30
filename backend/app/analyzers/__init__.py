"""Analyzer factory. Defaults to the rules analyzer; ``ANALYZER=hf`` selects the
optional Hugging Face model with automatic fallback to rules."""

from __future__ import annotations

import logging
from functools import lru_cache

from ..config import get_settings
from .base import SENTIMENT_LABELS, TOPICS, AnalysisResult, Analyzer
from .rules import RuleAnalyzer

logger = logging.getLogger(__name__)

__all__ = ["AnalysisResult", "Analyzer", "RuleAnalyzer", "SENTIMENT_LABELS", "TOPICS", "get_analyzer"]


@lru_cache
def get_analyzer() -> Analyzer:
    """Return the configured analyzer (cached)."""
    settings = get_settings()
    if settings.analyzer == "hf":
        try:
            from .hf import HfAnalyzer

            return HfAnalyzer()
        except Exception as exc:  # missing deps, download failure, etc.
            logger.warning("HF analyzer unavailable (%s); falling back to rules.", exc)
    return RuleAnalyzer()
