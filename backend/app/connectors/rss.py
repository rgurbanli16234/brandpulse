"""RSS/Atom connector.

Config: ``{"feeds": ["https://example.com/rss"]}``. Public feeds only — no scraping of
sites whose terms forbid it.
"""

from __future__ import annotations

import hashlib
import html
import logging
import re
from calendar import timegm
from datetime import datetime, timezone

import feedparser

from .base import Connector, FetchedMention

logger = logging.getLogger(__name__)

_TAGS = re.compile(r"<[^>]+>")
_WHITESPACE = re.compile(r"\s+")


def _plain_text(value: str | None) -> str:
    """Strip HTML tags/entities and collapse whitespace."""
    if not value:
        return ""
    return _WHITESPACE.sub(" ", html.unescape(_TAGS.sub(" ", value))).strip()


def _published(entry: dict) -> datetime | None:
    """Best-effort publication timestamp as an aware UTC datetime."""
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if not parsed:
        return None
    try:
        return datetime.fromtimestamp(timegm(parsed), tz=timezone.utc)
    except (OverflowError, ValueError, TypeError):
        return None


class RssConnector(Connector):
    """Reads new items from one or more public RSS/Atom feeds."""

    type = "rss"
    max_items_per_feed = 25

    def fetch(self) -> list[FetchedMention]:
        feeds = self.config.get("feeds") or []
        if isinstance(feeds, str):
            feeds = [feeds]

        mentions: list[FetchedMention] = []
        for feed_url in feeds:
            try:
                parsed = feedparser.parse(feed_url)
            except Exception as exc:  # network/DNS/parse failures
                logger.warning("RSS fetch failed for %s (%s).", feed_url, exc)
                continue
            if parsed.get("bozo") and not parsed.entries:
                logger.warning("RSS feed %s returned no usable entries.", feed_url)
            for entry in parsed.entries[: self.max_items_per_feed]:
                mention = self._to_mention(entry)
                if mention is not None:
                    mentions.append(mention)
        return mentions

    def _to_mention(self, entry: dict) -> FetchedMention | None:
        title = _plain_text(entry.get("title"))
        body = _plain_text(entry.get("summary") or entry.get("description"))
        text = " — ".join(part for part in (title, body) if part)
        if not text:
            return None

        link = entry.get("link") or None
        external_id = entry.get("id") or entry.get("guid") or link
        if not external_id:
            external_id = hashlib.sha256(text.encode("utf-8")).hexdigest()

        return FetchedMention(
            text=text[:5000],
            external_id=str(external_id),
            url=link,
            author=_plain_text(entry.get("author")) or None,
            created_at=_published(entry),
        )
