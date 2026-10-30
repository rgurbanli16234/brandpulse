"""Source endpoints: where mentions come from (csv, manual, reddit, rss, demo)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..connectors import PULL_TYPES
from ..db import get_db
from ..models import Keyword, Source, User
from ..schemas.source import SourceIn, SourceOut, SourceUpdate
from ..services.ingest import sync_source
from ..services.pipeline import run_pipeline
from .deps import get_current_user

router = APIRouter(prefix="/sources", tags=["sources"])


def _get_source(db: Session, business_id: int, source_id: int) -> Source:
    source = db.get(Source, source_id)
    if source is None or source.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return source


@router.get("", response_model=list[SourceOut])
def list_sources(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Source]:
    return list(
        db.scalars(select(Source).where(Source.business_id == user.business_id).order_by(Source.id)).all()
    )


@router.post("", response_model=SourceOut, status_code=status.HTTP_201_CREATED)
def create_source(
    payload: SourceIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Source:
    source = Source(
        business_id=user.business_id,
        type=payload.type,
        config_json=payload.config_json,
        enabled=payload.enabled,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.patch("/{source_id}", response_model=SourceOut)
def update_source(
    source_id: int,
    payload: SourceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Source:
    source = _get_source(db, user.business_id, source_id)
    if payload.config_json is not None:
        source.config_json = payload.config_json
    if payload.enabled is not None:
        source.enabled = payload.enabled
    db.commit()
    db.refresh(source)
    return source


@router.post("/{source_id}/sync")
def sync_source_now(
    source_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Pull a source immediately (instead of waiting for the background job)."""
    source = _get_source(db, user.business_id, source_id)
    if source.type not in PULL_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source type '{source.type}' is not pull-based.",
        )

    keywords = list(
        db.scalars(select(Keyword.term).where(Keyword.business_id == user.business_id)).all()
    )
    created = sync_source(db, source, keywords)
    db.commit()
    return {"mentions_created": created, "pipeline": run_pipeline(db, user.business_id)}


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    source = _get_source(db, user.business_id, source_id)
    db.delete(source)
    db.commit()
