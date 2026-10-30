"""End-to-end API smoke tests against the real app (SQLite, rules analyzer)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.conftest import DEFAULT_PASSWORD, register_business

API = "/api/v1"


# --------------------------------------------------------------------------- meta / auth
def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openapi_is_served(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    for path in (
        f"{API}/auth/register",
        f"{API}/analyze",
        f"{API}/mentions",
        f"{API}/mentions/upload-csv",
        f"{API}/demo/seed",
        f"{API}/threads",
        f"{API}/alerts",
        f"{API}/analytics/summary",
        f"{API}/analytics/sentiment-trend",
        f"{API}/analytics/topics",
        f"{API}/analytics/spikes",
        f"{API}/keywords",
        f"{API}/sources",
    ):
        assert path in paths, path


def test_register_creates_business_and_token(client: TestClient) -> None:
    response = client.post(
        f"{API}/auth/register",
        json={"business_name": "Acme Coffee", "email": "Owner@Example.com", "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["business"]["name"] == "Acme Coffee"
    assert body["user"]["email"] == "owner@example.com"


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    register_business(client)
    response = client.post(
        f"{API}/auth/register",
        json={"business_name": "Other", "email": "owner@example.com", "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 409


def test_login_success_and_failure(client: TestClient) -> None:
    register_business(client)

    ok = client.post(f"{API}/auth/login", json={"email": "owner@example.com", "password": DEFAULT_PASSWORD})
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    bad_password = client.post(
        f"{API}/auth/login", json={"email": "owner@example.com", "password": "wrong-password"}
    )
    assert bad_password.status_code == 401

    unknown = client.post(
        f"{API}/auth/login", json={"email": "nobody@example.com", "password": DEFAULT_PASSWORD}
    )
    assert unknown.status_code == 401


def test_protected_endpoints_require_auth(client: TestClient) -> None:
    for method, path in (("GET", f"{API}/mentions"), ("GET", f"{API}/threads"), ("GET", f"{API}/alerts")):
        assert client.request(method, path).status_code == 401

    assert client.post(f"{API}/analyze", json={"text": "hi"}).status_code == 401
    assert client.get(f"{API}/mentions", headers={"Authorization": "Bearer nonsense"}).status_code == 401


# --------------------------------------------------------------------------- analyze
def test_analyze_endpoint(client: TestClient, auth: dict[str, str]) -> None:
    response = client.post(
        f"{API}/analyze",
        headers=auth,
        json={"text": "Списали деньги дважды и не отвечают. Ужасно!"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "ru"
    assert body["sentiment_label"] in {"negative", "strongly_negative"}
    assert body["is_complaint"] is True
    assert body["topic"] == "Billing/Payment"


def test_analyze_rejects_empty_text(client: TestClient, auth: dict[str, str]) -> None:
    assert client.post(f"{API}/analyze", headers=auth, json={"text": ""}).status_code == 422


# --------------------------------------------------------------------------- mentions
def test_manual_mention_is_analyzed_and_deduped(client: TestClient, auth: dict[str, str]) -> None:
    payload = {"text": "Acme double charged my credit card and support never replied"}
    created = client.post(f"{API}/mentions/manual", headers=auth, json=payload)
    assert created.status_code == 201
    body = created.json()
    assert body["source"] == "manual"
    assert body["is_complaint"] is True
    assert body["thread_id"] is not None

    duplicate = client.post(f"{API}/mentions/manual", headers=auth, json=payload)
    assert duplicate.status_code == 409


def test_mentions_filters(client: TestClient, auth: dict[str, str]) -> None:
    client.post(f"{API}/mentions/manual", headers=auth, json={"text": "Great coffee, thank you!"})
    client.post(
        f"{API}/mentions/manual",
        headers=auth,
        json={"text": "The delivery never arrived and the courier was rude to me"},
    )

    all_mentions = client.get(f"{API}/mentions", headers=auth).json()
    assert len(all_mentions) == 2

    complaints = client.get(f"{API}/mentions", headers=auth, params={"complaint_only": True}).json()
    assert len(complaints) == 1
    assert complaints[0]["is_complaint"] is True

    search = client.get(f"{API}/mentions", headers=auth, params={"q": "courier"}).json()
    assert len(search) == 1

    by_topic = client.get(f"{API}/mentions", headers=auth, params={"topic": "Delivery/Shipping"}).json()
    assert len(by_topic) == 1

    assert client.get(f"{API}/mentions", headers=auth, params={"limit": 501}).status_code == 422


# --------------------------------------------------------------------------- demo + pipeline
@pytest.fixture
def seeded(client: TestClient, auth: dict[str, str]) -> dict:
    response = client.post(f"{API}/demo/seed", headers=auth)
    assert response.status_code == 200
    return response.json()


def test_demo_seed_runs_the_pipeline(seeded: dict) -> None:
    assert seeded["mentions_generated"] > 0
    assert seeded["mentions_created"] == seeded["mentions_generated"]
    assert seeded["pipeline"]["clustered"] > 0
    assert seeded["pipeline"]["scored_threads"] > 0


def test_demo_seed_is_idempotent(client: TestClient, auth: dict[str, str], seeded: dict) -> None:
    again = client.post(f"{API}/demo/seed", headers=auth).json()
    assert again["mentions_created"] == 0
    assert again["pipeline"]["clustered"] == 0


def test_thread_list_detail_and_status(client: TestClient, auth: dict[str, str], seeded: dict) -> None:
    threads = client.get(f"{API}/threads", headers=auth).json()
    assert threads

    thread_id = threads[0]["id"]
    detail = client.get(f"{API}/threads/{thread_id}", headers=auth).json()
    assert detail["id"] == thread_id
    assert detail["mentions"]
    assert detail["score_breakdown"]["weights"] == {"severity": 0.5, "reach": 0.3, "velocity": 0.2}

    updated = client.patch(f"{API}/threads/{thread_id}", headers=auth, json={"status": "resolved"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "resolved"

    resolved = client.get(f"{API}/threads", headers=auth, params={"status": "resolved"}).json()
    assert thread_id in {thread["id"] for thread in resolved}

    assert client.get(f"{API}/threads/999999", headers=auth).status_code == 404
    assert client.patch(f"{API}/threads/{thread_id}", headers=auth, json={"status": "nonsense"}).status_code == 422


def test_alerts_are_created_for_high_priority_threads(
    client: TestClient, auth: dict[str, str], seeded: dict
) -> None:
    alerts = client.get(f"{API}/alerts", headers=auth).json()
    assert alerts
    assert all(alert["tier"] in {"High", "Critical"} for alert in alerts)
    assert all(alert["channel"] == "in_app" for alert in alerts)

    unacknowledged = client.get(f"{API}/alerts", headers=auth, params={"acknowledged": False}).json()
    assert len(unacknowledged) == len(alerts)

    ack = client.post(f"{API}/alerts/{alerts[0]['id']}/ack", headers=auth)
    assert ack.status_code == 200
    assert ack.json()["acknowledged"] is True

    remaining = client.get(f"{API}/alerts", headers=auth, params={"acknowledged": False}).json()
    assert len(remaining) == len(alerts) - 1

    assert client.post(f"{API}/alerts/999999/ack", headers=auth).status_code == 404


# --------------------------------------------------------------------------- analytics
def test_analytics_summary(client: TestClient, auth: dict[str, str], seeded: dict) -> None:
    summary = client.get(f"{API}/analytics/summary", headers=auth).json()
    assert summary["total_mentions"] == seeded["mentions_generated"]
    assert summary["complaints"] > 0
    assert summary["open_threads"] > 0
    assert summary["mentions_24h"] > 0
    assert set(summary["sentiment_distribution"]) == {
        "positive",
        "neutral",
        "negative",
        "strongly_negative",
    }
    assert len(summary["top_topics"]) <= 5
    assert -1.0 <= summary["avg_sentiment"] <= 1.0


def test_sentiment_trend_is_zero_filled(client: TestClient, auth: dict[str, str], seeded: dict) -> None:
    trend = client.get(f"{API}/analytics/sentiment-trend", headers=auth, params={"days": 7}).json()
    assert trend["days"] == 7
    assert len(trend["points"]) == 7
    assert sum(point["total"] for point in trend["points"]) > 0
    assert all(point["total"] == 0 or point["total"] > 0 for point in trend["points"])

    assert client.get(f"{API}/analytics/sentiment-trend", headers=auth, params={"days": 0}).status_code == 422


def test_topic_breakdown(client: TestClient, auth: dict[str, str], seeded: dict) -> None:
    topics = client.get(f"{API}/analytics/topics", headers=auth).json()
    assert topics["total"] == seeded["mentions_generated"]
    assert topics["topics"]
    assert sum(topic["count"] for topic in topics["topics"]) == topics["total"]


def test_spike_detection_reports_a_multiplier(
    client: TestClient, auth: dict[str, str], seeded: dict
) -> None:
    spikes = client.get(f"{API}/analytics/spikes", headers=auth).json()
    assert spikes["window_hours"] == 24
    assert spikes["lookback_days"] == 7
    assert spikes["multiplier"] == 2.0

    detected = [spike for spike in spikes["spikes"] if spike["detected"]]
    assert detected, "the demo generator plants a spike that must be detected"
    for spike in detected:
        assert spike["last_24h"] >= 2
        assert spike["ratio"] >= spikes["multiplier"]


def test_empty_analytics_for_a_new_business(client: TestClient, auth: dict[str, str]) -> None:
    summary = client.get(f"{API}/analytics/summary", headers=auth).json()
    assert summary["total_mentions"] == 0
    assert summary["avg_sentiment"] == 0.0
    assert client.get(f"{API}/analytics/topics", headers=auth).json()["topics"] == []
    assert client.get(f"{API}/analytics/spikes", headers=auth).json()["spikes"] == []


# --------------------------------------------------------------------------- keywords
def test_keyword_crud(client: TestClient, auth: dict[str, str]) -> None:
    created = client.post(f"{API}/keywords", headers=auth, json={"term": "Acme", "type": "brand"})
    assert created.status_code == 201
    keyword_id = created.json()["id"]

    listed = client.get(f"{API}/keywords", headers=auth).json()
    assert [keyword["term"] for keyword in listed] == ["Acme"]

    assert client.delete(f"{API}/keywords/{keyword_id}", headers=auth).status_code == 204
    assert client.get(f"{API}/keywords", headers=auth).json() == []


# --------------------------------------------------------------------------- sources
def test_source_crud(client: TestClient, auth: dict[str, str]) -> None:
    created = client.post(
        f"{API}/sources",
        headers=auth,
        json={"type": "rss", "config_json": {"feeds": ["https://example.com/rss"]}},
    )
    assert created.status_code == 201
    source_id = created.json()["id"]

    updated = client.patch(f"{API}/sources/{source_id}", headers=auth, json={"enabled": False})
    assert updated.json()["enabled"] is False

    assert client.delete(f"{API}/sources/{source_id}", headers=auth).status_code == 204
    assert client.get(f"{API}/sources", headers=auth).json() == []


def test_sync_rejects_push_based_sources(client: TestClient, auth: dict[str, str]) -> None:
    created = client.post(f"{API}/sources", headers=auth, json={"type": "csv"})
    source_id = created.json()["id"]
    response = client.post(f"{API}/sources/{source_id}/sync", headers=auth)
    assert response.status_code == 400


def test_businesses_are_isolated(client: TestClient, seeded: dict, auth: dict[str, str]) -> None:
    other = register_business(client, email="other@example.com", business_name="Other Co")
    assert client.get(f"{API}/mentions", headers=other).json() == []
    assert client.get(f"{API}/threads", headers=other).json() == []
    assert client.get(f"{API}/alerts", headers=other).json() == []
    assert client.get(f"{API}/analytics/summary", headers=other).json()["total_mentions"] == 0
