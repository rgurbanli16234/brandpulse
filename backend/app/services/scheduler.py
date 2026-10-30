"""Background job (APScheduler): pull enabled sources, then run the pipeline.

The job runs in-process every ``PIPELINE_INTERVAL_MINUTES`` minutes. It is idempotent —
mentions are deduplicated and only new complaints are clustered — so overlapping or
missed runs are harmless.
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from ..config import get_settings
from ..db import SessionLocal
from ..models import Business
from .ingest import sync_business_sources
from .pipeline import run_pipeline

logger = logging.getLogger(__name__)

JOB_ID = "pipeline"

_scheduler: BackgroundScheduler | None = None


def run_scheduled_sync() -> dict[str, int]:
    """One tick: sync sources and run the pipeline for every business."""
    businesses = mentions = 0
    with SessionLocal() as db:
        for business in db.scalars(select(Business)).all():
            businesses += 1
            mentions += sync_business_sources(db, business.id)
            run_pipeline(db, business.id)
    if mentions:
        logger.info("Scheduled sync: %s new mention(s) across %s business(es).", mentions, businesses)
    return {"businesses": businesses, "mentions": mentions}


def start_scheduler() -> BackgroundScheduler | None:
    """Start the background scheduler (no-op when disabled or already running)."""
    global _scheduler
    settings = get_settings()
    if not settings.enable_scheduler:
        logger.info("Scheduler disabled (ENABLE_SCHEDULER=false).")
        return None
    if _scheduler is not None:
        return _scheduler

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        run_scheduled_sync,
        "interval",
        minutes=settings.pipeline_interval_minutes,
        id=JOB_ID,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("Scheduler started (every %s min).", settings.pipeline_interval_minutes)
    return _scheduler


def shutdown_scheduler() -> None:
    """Stop the background scheduler if it is running."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
