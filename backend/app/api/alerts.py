"""Alert endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Alert, IncidentThread, User
from ..schemas.alert import AlertOut
from .deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _to_out(alert: Alert, thread_title: str | None) -> AlertOut:
    return AlertOut(
        id=alert.id,
        thread_id=alert.thread_id,
        thread_title=thread_title,
        tier=alert.tier,
        summary=alert.summary,
        channel=alert.channel,
        sent_at=alert.sent_at,
        acknowledged=alert.acknowledged,
    )


@router.get("", response_model=list[AlertOut])
def list_alerts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    acknowledged: bool | None = None,
    limit: int = Query(default=100, le=500),
) -> list[AlertOut]:
    """List alerts for the business (newest first)."""
    stmt = (
        select(Alert, IncidentThread.title)
        .join(IncidentThread, Alert.thread_id == IncidentThread.id)
        .where(IncidentThread.business_id == user.business_id)
    )
    if acknowledged is not None:
        stmt = stmt.where(Alert.acknowledged.is_(acknowledged))
    stmt = stmt.order_by(Alert.sent_at.desc()).limit(limit)
    return [_to_out(alert, title) for alert, title in db.execute(stmt).all()]


@router.post("/{alert_id}/ack", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AlertOut:
    """Mark an alert as acknowledged."""
    row = db.execute(
        select(Alert, IncidentThread.title)
        .join(IncidentThread, Alert.thread_id == IncidentThread.id)
        .where(Alert.id == alert_id, IncidentThread.business_id == user.business_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert, title = row
    alert.acknowledged = True
    db.commit()
    db.refresh(alert)
    return _to_out(alert, title)
