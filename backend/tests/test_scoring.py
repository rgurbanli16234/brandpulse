"""Priority scoring tests: tier boundaries, the 0.5/0.3/0.2 weighting and the breakdown."""

from __future__ import annotations

from datetime import timedelta

import pytest

from app.models import IncidentThread, Mention, utcnow
from app.services.scoring import WEIGHTS, score_thread, tier_for_score


def make_mention(
    *,
    text: str = "the service was terrible and I want my money back",
    sentiment_score: float = -0.9,
    is_complaint: bool = True,
    age_minutes: float = 0.0,
    author_followers: int = 0,
    engagement: int = 0,
) -> Mention:
    return Mention(
        business_id=1,
        text=text,
        sentiment_label="negative",
        sentiment_score=sentiment_score,
        is_complaint=is_complaint,
        topic="Billing/Payment",
        created_at=utcnow() - timedelta(minutes=age_minutes),
        author_followers=author_followers,
        engagement=engagement,
    )


def make_thread(topic: str = "Billing/Payment") -> IncidentThread:
    return IncidentThread(business_id=1, title="t", topic=topic, mention_count=1)


# --------------------------------------------------------------------------- weights
def test_weights_match_the_spec() -> None:
    assert WEIGHTS == {"severity": 0.5, "reach": 0.3, "velocity": 0.2}
    assert sum(WEIGHTS.values()) == pytest.approx(1.0)


# --------------------------------------------------------------------------- tiers
@pytest.mark.parametrize(
    ("score", "tier"),
    [
        (0.0, "Low"),
        (0.2499, "Low"),
        (0.25, "Medium"),
        (0.4999, "Medium"),
        (0.5, "High"),
        (0.7499, "High"),
        (0.75, "Critical"),
        (1.0, "Critical"),
    ],
)
def test_tier_boundaries(score: float, tier: str) -> None:
    assert tier_for_score(score) == tier


# --------------------------------------------------------------------------- formula
def test_score_equals_weighted_factor_sum() -> None:
    score, tier, breakdown = score_thread(make_thread(), [make_mention()])
    factors = breakdown["factors"]
    expected = (
        WEIGHTS["severity"] * factors["severity"]
        + WEIGHTS["reach"] * factors["reach"]
        + WEIGHTS["velocity"] * factors["velocity"]
    )
    assert score == pytest.approx(expected, abs=1e-4)
    assert tier == tier_for_score(score)
    assert breakdown["tier"] == tier


def test_breakdown_is_explainable() -> None:
    _score, _tier, breakdown = score_thread(make_thread(), [make_mention()])
    assert breakdown["weights"] == WEIGHTS
    assert set(breakdown["factors"]) == {"severity", "reach", "velocity"}
    assert set(breakdown["inputs"]) == {
        "worst_negativity",
        "topic_weight",
        "raw_reach",
        "recent_mentions_60m",
        "baseline_per_hour",
        "mention_count",
    }
    for value in breakdown["factors"].values():
        assert 0.0 <= value <= 1.0


def test_severity_outweighs_reach() -> None:
    """A strongly negative billing complaint beats a mild price gripe from a huge account."""
    severe = score_thread(
        make_thread("Billing/Payment"),
        [make_mention(sentiment_score=-0.9)],
    )
    loud = score_thread(
        make_thread("Price"),
        [make_mention(sentiment_score=-0.2, author_followers=1_000_000)],
    )
    assert severe[1] in {"Medium", "High", "Critical"}
    assert severe[0] > loud[0]
    assert loud[2]["factors"]["reach"] == pytest.approx(1.0)


def test_velocity_rewards_a_recent_burst() -> None:
    burst = score_thread(
        make_thread(),
        [make_mention(age_minutes=600)]
        + [make_mention(age_minutes=index) for index in range(1, 6)],
    )
    quiet = score_thread(
        make_thread(),
        [make_mention(age_minutes=600 - index * 100) for index in range(6)],
    )
    assert burst[2]["factors"]["velocity"] > quiet[2]["factors"]["velocity"]
    assert burst[2]["factors"]["velocity"] == pytest.approx(1.0)
    assert quiet[2]["factors"]["velocity"] == pytest.approx(0.0)
    assert burst[0] > quiet[0]


def test_topic_weight_amplifies_severity() -> None:
    billing = score_thread(make_thread("Billing/Payment"), [make_mention()])
    other = score_thread(make_thread("Other"), [make_mention()])
    assert billing[2]["factors"]["severity"] > other[2]["factors"]["severity"]


def test_non_complaints_fall_back_to_all_mentions() -> None:
    """A thread with no complaints still scores (using every mention)."""
    score, _tier, breakdown = score_thread(
        make_thread(), [make_mention(is_complaint=False, sentiment_score=-0.2)]
    )
    assert breakdown["inputs"]["mention_count"] == 1
    assert score > 0


def test_score_is_bounded_between_zero_and_one() -> None:
    loudest = make_mention(sentiment_score=-1.0, author_followers=5_000_000, engagement=1_000_000)
    score, _tier, _breakdown = score_thread(make_thread(), [loudest])
    assert 0.0 <= score <= 1.0
