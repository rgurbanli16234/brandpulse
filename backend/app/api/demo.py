"""Demo seeding endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..seed import generate_mentions
from ..services.pipeline import add_mention, run_pipeline
from .deps import get_current_user

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
def seed_demo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Generate ~300 EN/AZ/RU mentions (with clusters + a spike) and run the pipeline."""
    rows = generate_mentions()
    created = 0
    for row in rows:
        mention = add_mention(
            db,
            user.business_id,
            text=row["text"],
            source="demo",
            author=row["author"],
            author_followers=row["author_followers"],
            url=row["url"],
            created_at=row["created_at"],
            engagement=row["engagement"],
            external_id=row["external_id"],
            language=row["language"],
        )
        if mention is not None:
            created += 1

    pipeline = run_pipeline(db, user.business_id)
    return {"mentions_created": created, "mentions_generated": len(rows), "pipeline": pipeline}
