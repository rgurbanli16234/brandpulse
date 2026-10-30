"""Incident-thread endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import IncidentThread, Mention, User
from ..schemas.thread import ThreadDetailOut, ThreadOut, ThreadStatusIn
from .deps import get_current_user

router = APIRouter(prefix="/threads", tags=["threads"])


def _get_thread(db: Session, business_id: int, thread_id: int) -> IncidentThread:
    thread = db.get(IncidentThread, thread_id)
    if thread is None or thread.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    return thread


@router.get("", response_model=list[ThreadOut])
def list_threads(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: str | None = Query(default=None, alias="status"),
    tier: str | None = None,
    limit: int = Query(default=100, le=500),
) -> list[IncidentThread]:
    """List incident threads, newest first."""
    stmt = select(IncidentThread).where(IncidentThread.business_id == user.business_id)
    if status_filter:
        stmt = stmt.where(IncidentThread.status == status_filter)
    if tier:
        stmt = stmt.where(IncidentThread.priority_tier == tier)
    stmt = stmt.order_by(IncidentThread.last_seen.desc()).limit(limit)
    return list(db.scalars(stmt).all())


@router.get("/{thread_id}", response_model=ThreadDetailOut)
def get_thread(
    thread_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ThreadDetailOut:
    """Thread detail: grouped mentions + why it has this priority."""
    thread = _get_thread(db, user.business_id, thread_id)
    mentions = list(
        db.scalars(
            select(Mention)
            .where(Mention.thread_id == thread.id)
            .order_by(Mention.created_at.desc())
        ).all()
    )
    breakdown: dict | None = None
    score: float | None = None
    for mention in mentions:
        if mention.score_breakdown_json:
            breakdown = mention.score_breakdown_json
            score = mention.priority_score
            break
    return ThreadDetailOut(
        **ThreadOut.model_validate(thread).model_dump(),
        priority_score=score,
        score_breakdown=breakdown,
        mentions=mentions,
    )


@router.patch("/{thread_id}", response_model=ThreadOut)
def update_thread_status(
    thread_id: int,
    payload: ThreadStatusIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IncidentThread:
    """Change the workflow status of a thread (open / investigating / resolved)."""
    thread = _get_thread(db, user.business_id, thread_id)
    thread.status = payload.status
    db.commit()
    db.refresh(thread)
    return thread
