from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.exceptions.business import BookingCancelTooLateError
from app.models.enums import BookingStatus
from app.services.client_booking_service import (
    can_client_cancel,
    can_client_reschedule,
    _ensure_within_cutoff,
)


class _FakeBusiness:
    settings = {"cancellation_hours": 24}


class _FakeBooking:
    def __init__(self, status, starts_at):
        self.status = status
        self.starts_at = starts_at


def test_can_client_cancel_future_pending() -> None:
    now = datetime(2026, 6, 23, 8, 0, tzinfo=ZoneInfo("America/New_York"))
    booking = _FakeBooking(
        BookingStatus.pending,
        datetime(2026, 6, 25, 10, 0, tzinfo=ZoneInfo("America/New_York")),
    )
    assert can_client_cancel(booking, _FakeBusiness(), now) is True


def test_can_client_cancel_too_soon() -> None:
    now = datetime(2026, 6, 23, 8, 0, tzinfo=ZoneInfo("America/New_York"))
    booking = _FakeBooking(
        BookingStatus.pending,
        datetime(2026, 6, 23, 10, 0, tzinfo=ZoneInfo("America/New_York")),
    )
    assert can_client_cancel(booking, _FakeBusiness(), now) is False


def test_can_client_reschedule_confirmed_future() -> None:
    now = datetime(2026, 6, 23, 8, 0, tzinfo=ZoneInfo("America/New_York"))
    booking = _FakeBooking(
        BookingStatus.confirmed,
        datetime(2026, 6, 25, 10, 0, tzinfo=ZoneInfo("America/New_York")),
    )
    assert can_client_reschedule(booking, _FakeBusiness(), now) is True


def test_can_client_reschedule_not_allowed_for_completed() -> None:
    now = datetime(2026, 6, 23, 8, 0, tzinfo=ZoneInfo("America/New_York"))
    booking = _FakeBooking(
        BookingStatus.completed,
        datetime(2026, 6, 25, 10, 0, tzinfo=ZoneInfo("America/New_York")),
    )
    assert can_client_reschedule(booking, _FakeBusiness(), now) is False


def test_ensure_within_cutoff_raises_when_too_late() -> None:
    booking = _FakeBooking(
        BookingStatus.pending,
        datetime.now(UTC) + timedelta(hours=2),
    )
    with pytest.raises(BookingCancelTooLateError):
        _ensure_within_cutoff(booking, _FakeBusiness())
