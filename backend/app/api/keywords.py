"""Keyword endpoints: what the business wants to monitor."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Keyword, User
from ..schemas.keyword import KeywordIn, KeywordOut
from .deps import get_current_user

router = APIRouter(prefix="/keywords", tags=["keywords"])


def _get_keyword(db: Session, business_id: int, keyword_id: int) -> Keyword:
    keyword = db.get(Keyword, keyword_id)
    if keyword is None or keyword.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")
    return keyword


@router.get("", response_model=list[KeywordOut])
def list_keywords(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Keyword]:
    return list(
        db.scalars(
            select(Keyword).where(Keyword.business_id == user.business_id).order_by(Keyword.id)
        ).all()
    )


@router.post("", response_model=KeywordOut, status_code=status.HTTP_201_CREATED)
def create_keyword(
    payload: KeywordIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Keyword:
    keyword = Keyword(business_id=user.business_id, term=payload.term.strip(), type=payload.type)
    db.add(keyword)
    db.commit()
    db.refresh(keyword)
    return keyword


@router.delete("/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_keyword(
    keyword_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    keyword = _get_keyword(db, user.business_id, keyword_id)
    db.delete(keyword)
    db.commit()
