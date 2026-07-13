from __future__ import annotations

from datetime import date, datetime, timedelta

from app.exceptions.business import SlotUnavailableError
from app.models.business import Business
from app.models.service import Service

SLOT_TOO_SOON_MESSAGE = "This time slot is too soon to book."
SLOT_OUTSIDE_WINDOW_MESSAGE = "This time slot is outside the booking window."

MAX_BOOKING_MIN_NOTICE_MINUTES = 43200


def effective_min_notice_minutes(
    service: Service,
    business_settings: dict | None = None,
) -> int:
    return int(getattr(service, "booking_min_notice_minutes", 0) or 0)


def effective_booking_window_days(
    service: Service,
    business_settings: dict | None = None,
) -> int | None:
    service_window = getattr(service, "booking_window_days", None)
    if service_window is None:
        return None
    return int(service_window)


def earliest_bookable_time(
    now: datetime,
    target_date: date,
    day_open: datetime,
    min_notice_minutes: int,
) -> datetime:
    if target_date == now.date():
        return now + timedelta(minutes=min_notice_minutes)
    return day_open


def latest_bookable_time(now: datetime, window_days: int) -> datetime:
    return now + timedelta(days=window_days)


def is_slot_within_booking_rules(
    slot_start: datetime,
    *,
    now: datetime,
    target_date: date,
    day_open: datetime,
    min_notice_minutes: int,
    window_days: int | None,
) -> bool:
    earliest = earliest_bookable_time(now, target_date, day_open, min_notice_minutes)
    if slot_start < earliest:
        return False
    if window_days is None:
        return True
    return slot_start <= latest_bookable_time(now, window_days)


def assert_slot_booking_rules(
    service: Service,
    business: Business,
    starts_at: datetime,
    *,
    now: datetime,
    day_open: datetime,
) -> None:
    settings = business.settings or {}
    localized = starts_at.astimezone(now.tzinfo)
    target_date = localized.date()
    min_notice = effective_min_notice_minutes(service, settings)
    window_days = effective_booking_window_days(service, settings)
    earliest = earliest_bookable_time(now, target_date, day_open, min_notice)
    if localized < earliest:
        raise SlotUnavailableError(SLOT_TOO_SOON_MESSAGE)
    if window_days is not None and localized > latest_bookable_time(now, window_days):
        raise SlotUnavailableError(SLOT_OUTSIDE_WINDOW_MESSAGE)
