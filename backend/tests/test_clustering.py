"""Clustering tests: near-duplicate complaints join one IncidentThread."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, IncidentThread, Mention
from app.services.clustering import cluster_new_complaints
from app.services.pipeline import add_mention

NEAR_DUPLICATES = [
    "Acme double charged my credit card and support never replied",
    "Acme double charged my credit card, but support never replied",
    "Acme double charged my credit card and support never replied to me",
]
UNRELATED = "The delivery never arrived and the courier was rude to me"
POSITIVE = "Great coffee and very friendly staff, thank you!"


def make_business(db: Session, name: str = "Acme Coffee") -> int:
    business = Business(name=name)
    db.add(business)
    db.flush()
    return business.id


def add_texts(db: Session, business_id: int, texts: list[str]) -> list[Mention]:
    mentions = []
    for text in texts:
        mention = add_mention(db, business_id, text=text, source="manual")
        assert mention is not None
        mentions.append(mention)
    db.commit()
    return mentions


def threads_of(db: Session, business_id: int) -> list[IncidentThread]:
    return list(
        db.scalars(select(IncidentThread).where(IncidentThread.business_id == business_id)).all()
    )


def test_near_duplicate_complaints_join_one_thread(db: Session) -> None:
    business_id = make_business(db)
    mentions = add_texts(db, business_id, NEAR_DUPLICATES)
    assert all(mention.is_complaint for mention in mentions)

    joined = cluster_new_complaints(db, business_id, threshold=0.6)
    db.commit()

    assert joined == 3
    assert len(threads_of(db, business_id)) == 1
    assert len({mention.thread_id for mention in mentions}) == 1


def test_unrelated_complaints_get_their_own_threads(db: Session) -> None:
    business_id = make_business(db)
    add_texts(db, business_id, NEAR_DUPLICATES + [UNRELATED])

    cluster_new_complaints(db, business_id, threshold=0.6)
    db.commit()

    assert len(threads_of(db, business_id)) == 2


def test_default_threshold_keeps_different_topics_apart(db: Session) -> None:
    business_id = make_business(db)
    add_texts(db, business_id, NEAR_DUPLICATES + [UNRELATED])

    cluster_new_complaints(db, business_id)  # default configured threshold
    db.commit()

    assert len(threads_of(db, business_id)) == 2


def test_very_high_threshold_keeps_every_complaint_separate(db: Session) -> None:
    business_id = make_business(db)
    add_texts(db, business_id, NEAR_DUPLICATES)

    cluster_new_complaints(db, business_id, threshold=0.99)
    db.commit()

    assert len(threads_of(db, business_id)) == 3


def test_non_complaints_are_not_clustered(db: Session) -> None:
    business_id = make_business(db)
    mentions = add_texts(db, business_id, [POSITIVE])
    assert mentions[0].is_complaint is False

    joined = cluster_new_complaints(db, business_id)
    db.commit()

    assert joined == 0
    assert mentions[0].thread_id is None
    assert threads_of(db, business_id) == []


def test_clustering_is_idempotent(db: Session) -> None:
    business_id = make_business(db)
    add_texts(db, business_id, NEAR_DUPLICATES)

    first = cluster_new_complaints(db, business_id, threshold=0.6)
    db.commit()
    second = cluster_new_complaints(db, business_id, threshold=0.6)
    db.commit()

    assert first == 3
    assert second == 0
    assert len(threads_of(db, business_id)) == 1


def test_thread_aggregates_follow_its_mentions(db: Session) -> None:
    business_id = make_business(db)
    add_texts(db, business_id, NEAR_DUPLICATES)
    cluster_new_complaints(db, business_id, threshold=0.6)
    db.commit()

    thread = threads_of(db, business_id)[0]
    assert thread.mention_count == 3
    assert thread.topic == "Billing/Payment"
    assert thread.first_seen <= thread.last_seen
    assert thread.status == "open"


def test_new_mention_joins_the_old_thread_over_time(db: Session) -> None:
    """A later near-duplicate is attached to the thread that already exists."""
    business_id = make_business(db)
    add_texts(db, business_id, NEAR_DUPLICATES[:1])
    cluster_new_complaints(db, business_id, threshold=0.6)
    db.commit()
    original_thread_id = threads_of(db, business_id)[0].id

    add_texts(db, business_id, NEAR_DUPLICATES[1:2])
    cluster_new_complaints(db, business_id, threshold=0.6)
    db.commit()

    assert len(threads_of(db, business_id)) == 1
    thread = threads_of(db, business_id)[0]
    assert thread.id == original_thread_id
    assert thread.mention_count == 2
