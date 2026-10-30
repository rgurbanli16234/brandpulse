"""Connector interface: pull public mentions from an external source.

Only ToS-friendly, pull-based sources are implemented (RSS/Atom feeds). Each connector
receives its per-source ``config_json`` and returns normalized ``FetchedMention`` items;
storing, deduplication and analysis are handled by the ingestion service.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class FetchedMention:
    """One item pulled from an external source, before storage."""

    text: str
    external_id: str
    url: str | None = None
    author: str | None = None
    author_followers: int = 0
    created_at: datetime | None = None
    engagement: int = 0
    language: str | None = None


class Connector(ABC):
    """Base class for source connectors."""

    #: value stored in ``Source.type``
    type: str = ""

    def __init__(self, config: dict | None = None) -> None:
        self.config = config or {}

    @abstractmethod
    def fetch(self) -> list[FetchedMention]:
        """Return recent items. Individual failures must be logged, not raised."""
        raise NotImplementedError
