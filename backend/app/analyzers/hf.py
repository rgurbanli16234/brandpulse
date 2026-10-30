"""Optional Hugging Face sentiment analyzer (enable with ``ANALYZER=hf``).

The model only supplies the sentiment signal; complaint detection, topic tagging and
language detection are delegated to the rule-based analyzer so the output shape and the
"complaint = negative + actionable signal" rule stay identical. The model is loaded
lazily on first use and cached by the analyzer factory.
"""

from __future__ import annotations

import logging

from ..config import get_settings
from .base import AnalysisResult, Analyzer
from .rules import RuleAnalyzer, has_actionable_signal

logger = logging.getLogger(__name__)

# The model returns negative/neutral/positive; older configs expose LABEL_0/1/2.
_LABEL_MAP: dict[str, str] = {
    "negative": "negative",
    "neutral": "neutral",
    "positive": "positive",
    "neg": "negative",
    "neu": "neutral",
    "pos": "positive",
    "label_0": "negative",
    "label_1": "neutral",
    "label_2": "positive",
}

_POLARITY: dict[str, float] = {"negative": -1.0, "neutral": 0.0, "positive": 1.0}


class HfAnalyzer(Analyzer):
    """Sentiment from a small multilingual model; the rest from the rules analyzer."""

    def __init__(self) -> None:
        self._rules = RuleAnalyzer()
        self._pipe = None
        
        try:
            from transformers import pipeline  # optional dependency (requirements-hf.txt)

            settings = get_settings()
            logger.info("Loading Hugging Face sentiment model %s ...", settings.hf_model)
            self._pipe = pipeline("sentiment-analysis", model=settings.hf_model, truncation=True)
        except Exception as e:
            logger.error("Failed to load Hugging Face model: %s. Falling back to RuleAnalyzer.", e)

    def _sentiment(self, text: str) -> tuple[str, float]:
        """Return a (polarity label, score in [-1, 1]) pair for the given text."""
        if not self._pipe:
            # Fallback to rules sentiment
            res = self._rules.analyze(text)
            return res.sentiment_label, res.sentiment_score

        try:
            prediction = self._pipe(text)[0]
            label = _LABEL_MAP.get(str(prediction["label"]).lower(), "neutral")
            confidence = float(prediction["score"])
            score = round(_POLARITY[label] * confidence, 3)
            if score <= -0.75:
                return "strongly_negative", score
            if score < -0.15:
                return "negative", score
            if score >= 0.5:
                return "positive", score
            return "neutral", score
        except Exception as e:
            logger.error("Hugging Face inference failed: %s. Falling back to RuleAnalyzer.", e)
            res = self._rules.analyze(text)
            return res.sentiment_label, res.sentiment_score

    def analyze(self, text: str) -> AnalysisResult:
        text = (text or "").strip()
        base = self._rules.analyze(text)
        if not text:
            return base

        label, score = self._sentiment(text)
        negative = label in ("negative", "strongly_negative")
        return AnalysisResult(
            sentiment_label=label,
            sentiment_score=score,
            is_complaint=negative and (has_actionable_signal(text) or score <= -0.45),
            topic=base.topic,
            language=base.language,
        )
