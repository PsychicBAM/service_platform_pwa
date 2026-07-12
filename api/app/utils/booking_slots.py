from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.enums import ServiceType
from app.models.service import Service


def normalize_starts_at(starts_at: datetime, tz: ZoneInfo) -> datetime:
    if starts_at.tzinfo is None:
        return starts_at.replace(tzinfo=tz)
    return starts_at.astimezone(tz)


def slot_starts_match(requested: datetime, slot_start: datetime) -> bool:
    return int(requested.timestamp()) == int(slot_start.timestamp())


def service_booking_capacity(service: Service) -> int:
    if service.type != ServiceType.booking:
        return 1
    capacity = getattr(service, "capacity", 1)
    if capacity is None:
        return 1
    return max(1, int(capacity))
