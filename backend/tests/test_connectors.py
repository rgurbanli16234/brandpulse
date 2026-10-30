"""RSS connector + ingestion service tests (no network: a local feed file is used)."""

from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connectors import PULL_TYPES, RssConnector, get_connector
from app.models import Business, Keyword, Mention, Source
from app.services.ingest import sync_business_sources, sync_source

FEED_XML = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Acme news</title>
  <item>
    <title>Acme double charged me again</title>
    <link>https://example.com/a</link>
    <guid>item-1</guid>
    <description>&lt;p&gt;Terrible. &lt;b&gt;Twice&lt;/b&gt; billed, no response.&lt;/p&gt;</description>
    <author>angry@example.com (A. User)</author>
    <pubDate>Wed, 29 Oct 2026 10:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Unrelated headline about the weather</title>
    <link>https://example.com/b</link>
    <guid>item-2</guid>
    <description>Sunny all week.</description>
  </item>
</channel></rss>
"""


@pytest.fixture
def feed_file(tmp_path: Path) -> Path:
    path = tmp_path / "feed.xml"
    path.write_text(FEED_XML, encoding="utf-8")
    return path


def make_business_with_source(db: Session, feed_path: Path, *, terms: tuple[str, ...] = ("acme",)) -> tuple[int, int]:
    business = Business(name="Acme Coffee")
    db.add(business)
    db.flush()
    for term in terms:
        db.add(Keyword(business_id=business.id, term=term, type="brand"))
    source = Source(
        business_id=business.id,
        type="rss",
        config_json={"feeds": [str(feed_path)]},
        enabled=True,
    )
    db.add(source)
    db.commit()
    return business.id, source.id


# --------------------------------------------------------------------------- connector
def test_registry_exposes_only_pull_based_sources() -> None:
    assert PULL_TYPES == ("rss",)
    assert isinstance(get_connector("rss"), RssConnector)


def test_unknown_source_type_is_rejected() -> None:
    with pytest.raises(ValueError):
        get_connector("twitter")


def test_rss_connector_normalizes_entries(feed_file: Path) -> None:
    items = RssConnector({"feeds": [str(feed_file)]}).fetch()
    assert len(items) == 2

    first = items[0]
    assert first.external_id == "item-1"
    assert first.url == "https://example.com/a"
    assert "Twice" in first.text
    assert "<" not in first.text  # HTML stripped
    assert first.created_at is not None
    assert first.created_at.tzinfo is not None


def test_rss_connector_accepts_a_single_feed_string(feed_file: Path) -> None:
    items = RssConnector({"feeds": str(feed_file)}).fetch()
    assert len(items) == 2


def test_rss_connector_survives_a_broken_feed(feed_file: Path) -> None:
    items = RssConnector({"feeds": ["https://not-a-real-host.invalid/rss"]}).fetch()
    assert items == []
    assert RssConnector({"feeds": [str(feed_file)]}).fetch()


# --------------------------------------------------------------------------- ingestion
def test_sync_filters_by_business_keywords(db: Session, feed_file: Path) -> None:
    business_id, source_id = make_business_with_source(db, feed_file)
    created = sync_source(db, db.get(Source, source_id), ["acme"])
    db.commit()

    assert created == 1
    texts = [m.text for m in db.scalars(select(Mention).where(Mention.business_id == business_id)).all()]
    assert len(texts) == 1
    assert "Acme" in texts[0]


def test_sync_without_keywords_imports_everything(db: Session, feed_file: Path) -> None:
    business_id, source_id = make_business_with_source(db, feed_file, terms=())
    created = sync_source(db, db.get(Source, source_id), [])
    db.commit()

    assert created == 2


def test_sync_source_via_business_is_idempotent(db: Session, feed_file: Path) -> None:
    business_id, _source_id = make_business_with_source(db, feed_file)

    assert sync_business_sources(db, business_id) == 1
    assert sync_business_sources(db, business_id) == 0


def test_disabled_sources_are_skipped(db: Session, feed_file: Path) -> None:
    business_id, source_id = make_business_with_source(db, feed_file)
    source = db.get(Source, source_id)
    assert source is not None
    source.enabled = False
    db.commit()

    assert sync_business_sources(db, business_id) == 0


def test_ingested_mentions_are_analyzed(db: Session, feed_file: Path) -> None:
    business_id, source_id = make_business_with_source(db, feed_file)
    sync_source(db, db.get(Source, source_id), ["acme"])
    db.commit()

    mention = db.scalars(select(Mention).where(Mention.business_id == business_id)).one()
    assert mention.source == "rss"
    assert mention.sentiment_label is not None
    assert mention.is_complaint is True
    assert mention.topic == "Billing/Payment"
