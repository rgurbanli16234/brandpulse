"""Ingestion from pull-based sources (connectors) into the pipeline.

``Source.config_json`` holds the connector config (e.g. the RSS feed URLs). Items are
filtered by the business keywords when any are configured, then handed to
``add_mention``, which deduplicates and analyzes them.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..connectors import PULL_TYPES, get_connector
from ..models import Keyword, Source
from .pipeline import add_mention

logger = logging.getLogger(__name__)


def sync_source(db: Session, source: Source, keywords: Sequence[str] = ()) -> int:
    """Fetch one source and store its new mentions. Returns the number created."""
    connector = get_connector(source.type, source.config_json)
    terms = [term.lower() for term in keywords if term]

    created = 0
    for item in connector.fetch():
        if terms and not any(term in item.text.lower() for term in terms):
            continue
        mention = add_mention(
            db,
            source.business_id,
            text=item.text,
            source=source.type,
            author=item.author,
            author_followers=item.author_followers,
            url=item.url,
            created_at=item.created_at,
            engagement=item.engagement,
            external_id=item.external_id,
            language=item.language,
        )
        if mention is not None:
            created += 1

    db.flush()
    logger.info("Source %s (%s): %s new mention(s).", source.id, source.type, created)
    return created


def sync_business_sources(db: Session, business_id: int) -> int:
    """Run every enabled pull-based source of a business. Returns mentions created."""
    keywords = list(
        db.scalars(select(Keyword.term).where(Keyword.business_id == business_id)).all()
    )
    sources = list(
        db.scalars(
            select(Source).where(
                Source.business_id == business_id,
                Source.enabled.is_(True),
                Source.type.in_(PULL_TYPES),
            )
        ).all()
    )

    created = 0
    for source in sources:
        try:
            created += sync_source(db, source, keywords)
        except Exception as exc:  # a broken source must not stop the others
            logger.warning("Source %s (%s) sync failed (%s).", source.id, source.type, exc)

    db.commit()
    return created
