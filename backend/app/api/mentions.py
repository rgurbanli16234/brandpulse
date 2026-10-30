"""Mention ingestion + listing endpoints."""

from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Mention, User
from ..schemas.mention import CsvUploadOut, ManualMentionIn, MentionOut
from ..services.pipeline import add_mention, run_pipeline
from .deps import get_current_user

router = APIRouter(prefix="/mentions", tags=["mentions"])


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _parse_int(value: str | None) -> int:
    """Parse an optional CSV integer; blank or malformed cells become 0."""
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return 0


@router.post("/manual", response_model=MentionOut, status_code=status.HTTP_201_CREATED)
def add_manual(
    payload: ManualMentionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Mention:
    """Paste a single mention; it is analyzed and pushed through the pipeline."""
    mention = add_mention(
        db,
        user.business_id,
        text=payload.text,
        source="manual",
        author=payload.author,
        author_followers=payload.author_followers,
        url=payload.url,
        engagement=payload.engagement,
        created_at=payload.created_at,
    )
    if mention is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate mention")
    run_pipeline(db, user.business_id)
    db.refresh(mention)
    return mention


@router.post("/upload-csv", response_model=CsvUploadOut)
async def upload_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CsvUploadOut:
    """Import mentions from a CSV file (column ``text`` is required)."""
    raw = await file.read()
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames or "text" not in {f.strip().lower() for f in reader.fieldnames}:
        raise HTTPException(status_code=400, detail="CSV must contain a 'text' column")

    imported = 0
    skipped = 0
    for row in reader:
        normalized = {(k or "").strip().lower(): (v or "") for k, v in row.items()}
        mention = add_mention(
            db,
            user.business_id,
            text=normalized.get("text", ""),
            source="csv",
            author=normalized.get("author") or None,
            author_followers=_parse_int(normalized.get("author_followers")),
            url=normalized.get("url") or None,
            engagement=_parse_int(normalized.get("engagement")),
            created_at=_parse_dt(normalized.get("created_at")),
            external_id=normalized.get("external_id") or None,
            language=normalized.get("language") or None,
        )
        if mention is None:
            skipped += 1
        else:
            imported += 1

    pipeline = run_pipeline(db, user.business_id)
    return CsvUploadOut(imported=imported, skipped=skipped, pipeline=pipeline)


@router.get("", response_model=list[MentionOut])
def list_mentions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    sentiment: str | None = None,
    topic: str | None = None,
    tier: str | None = None,
    complaint_only: bool = False,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    q: str | None = None,
    limit: int = Query(default=50, le=500),
    offset: int = 0,
) -> list[Mention]:
    """List mentions with filters (sentiment, topic, tier, complaint-only, date range, search)."""
    stmt = select(Mention).where(Mention.business_id == user.business_id)
    if sentiment:
        stmt = stmt.where(Mention.sentiment_label == sentiment)
    if topic:
        stmt = stmt.where(Mention.topic == topic)
    if tier:
        stmt = stmt.where(Mention.priority_tier == tier)
    if complaint_only:
        stmt = stmt.where(Mention.is_complaint.is_(True))
    if date_from:
        stmt = stmt.where(Mention.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Mention.created_at <= date_to)
    if q:
        stmt = stmt.where(Mention.text.ilike(f"%{q}%"))
    stmt = stmt.order_by(Mention.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())
