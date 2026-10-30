"""Connector registry. Add new (ToS-friendly) connectors here."""

from __future__ import annotations

from .base import Connector, FetchedMention
from .rss import RssConnector

CONNECTORS: dict[str, type[Connector]] = {
    RssConnector.type: RssConnector,
}

#: Source types that are pulled by the background job (as opposed to push: manual/csv/demo).
PULL_TYPES: tuple[str, ...] = tuple(CONNECTORS)

__all__ = ["CONNECTORS", "PULL_TYPES", "Connector", "FetchedMention", "get_connector"]


def get_connector(source_type: str, config: dict | None = None) -> Connector:
    """Instantiate the connector for a source type."""
    try:
        connector_cls = CONNECTORS[source_type]
    except KeyError:
        raise ValueError(f"Unsupported source type: {source_type!r}") from None
    return connector_cls(config)
