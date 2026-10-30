"""Analyzer interface. Every analyzer turns raw text into a small analysis result."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

# Sentiment gradient, ordered from most negative to most positive.
SENTIMENT_LABELS = ("strongly_negative", "negative", "neutral", "positive")

# Topic taxonomy (also used for keyword-based tagging).
TOPICS = (
    "Billing/Payment",
    "Product Quality",
    "Customer Service",
    "Delivery/Shipping",
    "Website/App Bug",
    "Price",
    "Staff Behavior",
    "Other",
)


@dataclass
class AnalysisResult:
    sentiment_label: str
    sentiment_score: float  # in [-1, 1]
    is_complaint: bool
    topic: str
    language: str = "en"


class Analyzer(ABC):
    """Base class for pluggable text analyzers."""

    @abstractmethod
    def analyze(self, text: str) -> AnalysisResult:
        """Analyze a single piece of text."""
        raise NotImplementedError
