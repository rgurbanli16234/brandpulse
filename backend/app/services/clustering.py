"""Complaint clustering: near-duplicate complaints join the same IncidentThread.

Uses TF-IDF + cosine similarity (scikit-learn). Only complaints are clustered;
casual mentions are left without a thread.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import IncidentThread, Mention, as_utc, utcnow


def _new_thread(business_id: int, mention: Mention) -> IncidentThread:
    title = mention.text.strip().replace("\n", " ")
    return IncidentThread(
        business_id=business_id,
        title=(title[:117] + "...") if len(title) > 120 else title,
        topic=mention.topic or "Other",
        first_seen=as_utc(mention.created_at),
        last_seen=as_utc(mention.created_at),
        mention_count=1,
        priority_tier="Low",
        status="open",
    )


def refresh_thread_aggregates(db: Session, thread: IncidentThread) -> None:
    """Recompute title-independent aggregates from the thread's mentions."""
    members = db.scalars(select(Mention).where(Mention.thread_id == thread.id)).all()
    if not members:
        return
    times = [as_utc(m.created_at) for m in members]
    topics: dict[str, int] = {}
    for m in members:
        topics[m.topic or "Other"] = topics.get(m.topic or "Other", 0) + 1
    thread.mention_count = len(members)
    thread.first_seen = min(times)
    thread.last_seen = max(times)
    thread.topic = max(topics, key=lambda k: topics[k])


def cluster_new_complaints(
    db: Session,
    business_id: int,
    *,
    threshold: float | None = None,
    window_hours: int | None = None,
) -> int:
    """Assign unclustered complaints to threads (creating new ones as needed).

    Returns the number of mentions that joined a thread.
    """
    settings = get_settings()
    threshold = settings.clustering_threshold if threshold is None else threshold
    window = timedelta(hours=settings.clustering_window_hours if window_hours is None else window_hours)

    pending = list(
        db.scalars(
            select(Mention)
            .where(
                Mention.business_id == business_id,
                Mention.is_complaint.is_(True),
                Mention.thread_id.is_(None),
            )
            .order_by(Mention.created_at)
        ).all()
    )
    if not pending:
        return 0

    existing = list(db.scalars(select(IncidentThread).where(IncidentThread.business_id == business_id)).all())
    refs: list[dict] = []
    for thread in existing:
        members = list(thread.mentions)
        refs.append(
            {
                "thread": thread,
                "texts": [m.text for m in members],
                "times": [as_utc(m.created_at) for m in members],
            }
        )

    new_texts = [m.text for m in pending]
    corpus = new_texts + [t for ref in refs for t in ref["texts"]]
    if not any(t.strip() for t in corpus):
        return 0

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
    matrix = vectorizer.fit_transform(corpus)

    # Row bookkeeping: rows 0..len(new)-1 are the pending mentions.
    offset = len(new_texts)
    for ref in refs:
        ref["rows"] = list(range(offset, offset + len(ref["texts"])))
        offset += len(ref["texts"])

    joined = 0
    for i, mention in enumerate(pending):
        m_time = as_utc(mention.created_at)
        best_ref: dict | None = None
        best_sim = 0.0

        for ref in refs:
            times = ref["times"]
            if times and min(abs((m_time - t).total_seconds()) for t in times) > window.total_seconds():
                continue
            sims = cosine_similarity(matrix[i], matrix[ref["rows"]])[0]
            if len(sims) and float(sims.max()) > best_sim:
                best_sim = float(sims.max())
                best_ref = ref

        if best_ref is not None and best_sim >= threshold:
            thread = best_ref["thread"]
        else:
            thread = _new_thread(business_id, mention)
            db.add(thread)
            db.flush()
            best_ref = {"thread": thread, "texts": [], "times": [], "rows": []}
            refs.append(best_ref)

        mention.thread_id = thread.id
        best_ref["texts"].append(mention.text)
        best_ref["times"].append(m_time)
        best_ref["rows"].append(i)  # reuse the pending row as the thread vector
        joined += 1

    db.flush()
    for ref in refs:
        refresh_thread_aggregates(db, ref["thread"])
    db.flush()
    return joined
