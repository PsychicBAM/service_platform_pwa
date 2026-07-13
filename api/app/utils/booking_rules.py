from __future__ import annotations

from datetime import date, datetime, timedelta

from app.exceptions.business import SlotUnavailableError
from app.models.business import Business
from app.models.service import Service

SLOT_TOO_SOON_MESSAGE = "This time slot is too soon to book."
SLOT_OUTSIDE_WINDOW_MESSAGE = "This time slot is outside the booking window."

MAX_BOOKING_MIN_NOTICE_MINUTES = 43200


def _business_min_notice_minutes(business_settings: dict | None) -> int:
    if not business_settings:
        return 0
    hours = business_settings.get("min_advance_booking_hours")
    if hours is None:
        return 0
    return int(hours) * 60


def _service_min_notice_minutes(service: Service) -> int:
    return int(getattr(service, "booking_min_notice_minutes", 0) or 0)


def effective_min_notice_minutes(
    service: Service,
    business_settings: dict | None = None,
) -> int:
    return max(
        _business_min_notice_minutes(business_settings),
        _service_min_notice_minutes(service),
    )


def _business_booking_window_days(business_settings: dict | None) -> int | None:
    if not business_settings:
        return None
    days = business_settings.get("max_advance_booking_days")
    if days is None:
        return None
    return int(days)


def _service_booking_window_days(service: Service) -> int | None:
    service_window = getattr(service, "booking_window_days", None)
    if service_window is None:
        return None
    return int(service_window)


def effective_booking_window_days(
    service: Service,
    business_settings: dict | None = None,
) -> int | None:
    business_days = _business_booking_window_days(business_settings)
    service_days = _service_booking_window_days(service)
    if business_days is None and service_days is None:
        return None
    if business_days is None:
        return service_days
    if service_days is None:
        return business_days
    return min(business_days, service_days)


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
