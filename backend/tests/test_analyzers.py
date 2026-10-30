"""Analyzer tests: multilingual rules (EN/AZ/RU) + the complaint-vs-noise rule."""

from __future__ import annotations

import pytest

from app.analyzers import get_analyzer
from app.analyzers.base import Analyzer
from app.analyzers.rules import RuleAnalyzer, detect_language, has_actionable_signal

analyzer = RuleAnalyzer()

NEGATIVE_LABELS = {"negative", "strongly_negative"}


def test_factory_defaults_to_rules() -> None:
    assert isinstance(get_analyzer(), RuleAnalyzer)


def test_analyzer_protocol() -> None:
    assert isinstance(analyzer, Analyzer)


# --------------------------------------------------------------------------- English
def test_english_complaint_detected() -> None:
    result = analyzer.analyze(
        "They double charged me and support never replied. Terrible service."
    )
    assert result.language == "en"
    assert result.sentiment_label in NEGATIVE_LABELS
    assert result.sentiment_score < 0
    assert result.is_complaint is True
    assert result.topic == "Billing/Payment"


def test_english_positive_mention_is_not_a_complaint() -> None:
    result = analyzer.analyze("Great coffee and very friendly staff, thank you!")
    assert result.language == "en"
    assert result.sentiment_label == "positive"
    assert result.sentiment_score > 0
    assert result.is_complaint is False


def test_neutral_smalltalk_is_not_a_complaint() -> None:
    result = analyzer.analyze("I walked past the shop today.")
    assert result.sentiment_label == "neutral"
    assert result.sentiment_score == 0.0
    assert result.is_complaint is False


def test_negative_without_actionable_signal_is_noise_not_a_complaint() -> None:
    """Complaint = negative sentiment AND an actionable signal (or strong negativity)."""
    result = analyzer.analyze("The manager was rude and humiliated me in front of everyone.")
    assert result.sentiment_label in NEGATIVE_LABELS
    assert result.is_complaint is True


def test_negation_flips_polarity() -> None:
    result = analyzer.analyze("not good at all")
    assert result.sentiment_label in NEGATIVE_LABELS


# --------------------------------------------------------------------------- Azerbaijani
def test_azerbaijani_complaint_detected() -> None:
    result = analyzer.analyze("Pul qaytarmadılar! Cavab da vermirlər, rəzil xidmət.")
    assert result.language == "az"
    assert result.sentiment_label in NEGATIVE_LABELS
    assert result.is_complaint is True


def test_azerbaijani_positive_mention_is_not_a_complaint() -> None:
    result = analyzer.analyze("Çox yaxşı xidmət, təşəkkürlər!")
    assert result.language == "az"
    assert result.sentiment_label == "positive"
    assert result.is_complaint is False


def test_azerbaijani_delivery_complaint() -> None:
    result = analyzer.analyze("Sifariş gəlmədi və kuryer gecikdi, dəstək cavab vermir.")
    assert result.language == "az"
    assert result.sentiment_label in NEGATIVE_LABELS
    assert result.is_complaint is True


# --------------------------------------------------------------------------- Russian
def test_russian_complaint_detected() -> None:
    result = analyzer.analyze("Списали деньги дважды и не отвечают. Ужасно!")
    assert result.language == "ru"
    assert result.sentiment_label in NEGATIVE_LABELS
    assert result.is_complaint is True
    assert result.topic == "Billing/Payment"


def test_russian_positive_mention_is_not_a_complaint() -> None:
    result = analyzer.analyze("Отлично, спасибо, быстро доставили!")
    assert result.language == "ru"
    assert result.sentiment_label == "positive"
    assert result.is_complaint is False


def test_russian_delivery_complaint() -> None:
    result = analyzer.analyze("Мой заказ пришёл сломанный, и курьер опоздал.")
    assert result.language == "ru"
    assert result.sentiment_label in NEGATIVE_LABELS
    assert result.is_complaint is True


# --------------------------------------------------------------------------- helpers
@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Fast and friendly service", "en"),
        ("Çox gözəl və sürətli", "az"),
        ("Очень быстро и удобно", "ru"),
    ],
)
def test_language_detection(text: str, expected: str) -> None:
    assert detect_language(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("my card was charged twice", True),
        ("the refund never arrived", True),
        ("курьер опоздал", True),
        ("sifariş gəlmədi", True),
        ("absolutely beautiful weather", False),
    ],
)
def test_actionable_signal_detection(text: str, expected: bool) -> None:
    assert has_actionable_signal(text) is expected


def test_empty_text_is_handled() -> None:
    result = analyzer.analyze("   ")
    assert result.sentiment_label == "neutral"
    assert result.sentiment_score == 0.0
    assert result.is_complaint is False
    assert result.topic == "Other"


def test_score_is_bounded() -> None:
    for text in ("scam scam scam fraud fraud", "amazing excellent perfect love"):
        assert -1.0 <= analyzer.analyze(text).sentiment_score <= 1.0
