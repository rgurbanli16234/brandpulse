"""ORM models for BrandPulse.

Every entity that belongs to a customer carries ``business_id`` so the app is
multi-business from the start.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime | None) -> datetime:
    """Return a timezone-aware UTC datetime (SQLite round-trips drop the tzinfo)."""
    if value is None:
        return utcnow()
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    plan: Mapped[str] = mapped_column(String(40), default="free")
    alert_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    webhook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="business", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    business: Mapped[Business] = relationship(back_populates="users")


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    term: Mapped[str] = mapped_column(String(200))
    # brand | product | executive | typo | competitor
    type: Mapped[str] = mapped_column(String(40), default="brand")


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    # csv | manual | reddit | rss | demo
    type: Mapped[str] = mapped_column(String(40))
    config_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class IncidentThread(Base):
    __tablename__ = "incident_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    topic: Mapped[str] = mapped_column(String(40), default="Other")
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    mention_count: Mapped[int] = mapped_column(Integer, default=0)
    priority_tier: Mapped[str] = mapped_column(String(20), default="Low")
    # open | investigating | resolved
    status: Mapped[str] = mapped_column(String(20), default="open")

    mentions: Mapped[list["Mention"]] = relationship(back_populates="thread")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="thread", cascade="all, delete-orphan")


class Mention(Base):
    __tablename__ = "mentions"
    __table_args__ = (UniqueConstraint("business_id", "external_id", name="uq_mention_business_external"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)

    # Ingestion origin. Kept as a plain string ("csv" | "manual" | "reddit" | "rss" | "demo").
    source: Mapped[str] = mapped_column(String(40), default="manual")
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    author: Mapped[str | None] = mapped_column(String(200), nullable=True)
    author_followers: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    engagement: Mapped[int] = mapped_column(Integer, default=0)

    # Analysis output
    sentiment_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_complaint: Mapped[bool] = mapped_column(Boolean, default=False)
    topic: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # Clustering + priority
    thread_id: Mapped[int | None] = mapped_column(
        ForeignKey("incident_threads.id", ondelete="SET NULL"), nullable=True, index=True
    )
    priority_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    priority_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    score_breakdown_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    thread: Mapped[IncidentThread | None] = relationship(back_populates="mentions")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("incident_threads.id", ondelete="CASCADE"), index=True)
    tier: Mapped[str] = mapped_column(String(20))
    summary: Mapped[str] = mapped_column(Text)
    # in_app | email | webhook
    channel: Mapped[str] = mapped_column(String(20), default="in_app")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)

    thread: Mapped[IncidentThread] = relationship(back_populates="alerts")
