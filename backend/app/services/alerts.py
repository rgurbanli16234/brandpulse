"""Alerting: High/Critical threads produce alerts (in-app + optional email/webhook).

A per-thread cooldown prevents repeated alerts for the same thread.
Summaries are template-based; an LLM summary is used only when LLM_API_KEY is set.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Alert, Business, IncidentThread, Mention, as_utc, utcnow

logger = logging.getLogger(__name__)

ALERT_TIERS = ("High", "Critical")


def build_summary(thread: IncidentThread, mentions: list[Mention], score: float) -> str:
    """Short, human-readable alert summary."""
    ordered = sorted(mentions, key=lambda m: as_utc(m.created_at), reverse=True)
    worst = max(ordered, key=lambda m: m.author_followers + m.engagement)
    snippet = " ".join(worst.text.split())[:160]
    reach = worst.author_followers + worst.engagement
    return (
        f"{thread.priority_tier} priority ({score:.2f}): {thread.mention_count} complaint(s) about "
        f"{thread.topic}. Latest example — \"{snippet}\""
        + (f" (by {worst.author}, ~{reach:,} reach)" if worst.author else "")
    )


def _llm_summary(summary: str, thread: IncidentThread) -> str | None:
    """Optional LLM rewrite of the template summary. Returns None when unavailable."""
    settings = get_settings()
    if not settings.llm_api_key:
        return None
    try:
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "Rewrite the alert for a small business owner in one short, plain sentence.",
                    },
                    {"role": "user", "content": summary},
                ],
                "max_tokens": 80,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:  # network/quota/etc. — fall back to the template
        logger.warning("LLM summary failed (%s); using template.", exc)
        return None


def _send_email(to: str, subject: str, body: str) -> bool:
    settings = get_settings()
    if not (settings.smtp_host and settings.smtp_from):
        return False
    try:
        message = EmailMessage()
        message["From"] = settings.smtp_from
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password or "")
            smtp.send_message(message)
        return True
    except Exception as exc:
        logger.warning("Email alert failed (%s).", exc)
        return False


def _send_webhook(url: str, payload: dict) -> bool:
    try:
        httpx.post(url, json=payload, timeout=5)
        return True
    except Exception as exc:
        logger.warning("Webhook alert failed (%s).", exc)
        return False


def create_alerts(
    db: Session,
    business: Business,
    scored_threads: list[tuple[IncidentThread, float, str, dict]],
) -> int:
    """Create alerts for High/Critical threads, honoring the cooldown. Returns alerts sent."""
    settings = get_settings()
    cooldown = settings.alert_cooldown_minutes * 60
    now = utcnow()
    sent = 0

    for thread, score, tier, _breakdown in scored_threads:
        if tier not in ALERT_TIERS:
            continue

        last = db.scalar(
            select(Alert)
            .where(Alert.thread_id == thread.id)
            .order_by(Alert.sent_at.desc())
            .limit(1)
        )
        if last is not None and (now - as_utc(last.sent_at)).total_seconds() < cooldown:
            continue

        mentions = list(db.scalars(select(Mention).where(Mention.thread_id == thread.id)).all())
        summary = _llm_summary(build_summary(thread, mentions, score), thread) or build_summary(
            thread, mentions, score
        )

        # In-app is always delivered.
        db.add(Alert(thread_id=thread.id, tier=tier, summary=summary, channel="in_app"))
        sent += 1

        if business.alert_email and _send_email(
            business.alert_email, f"[BrandPulse] {tier}: {thread.title}", summary
        ):
            db.add(Alert(thread_id=thread.id, tier=tier, summary=summary, channel="email"))

        if business.webhook_url and _send_webhook(
            business.webhook_url,
            {"tier": tier, "score": score, "topic": thread.topic, "title": thread.title, "summary": summary},
        ):
            db.add(Alert(thread_id=thread.id, tier=tier, summary=summary, channel="webhook"))

    db.flush()
    return sent
