"""Unit tests for auto-confirm booking status resolution."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models.enums import BookingStatus
from app.utils.booking_rules import resolve_booking_status_for_auto_confirm


def test_auto_confirm_disabled_stays_pending() -> None:
    starts = datetime(2026, 7, 21, 12, 0, tzinfo=UTC)
    status = resolve_booking_status_for_auto_confirm(
        {"auto_confirm_bookings": False, "auto_confirm_within_hours": 24},
        starts_at=starts,
        now=starts - timedelta(hours=1),
    )
    assert status == BookingStatus.pending


def test_auto_confirm_unlimited_confirms() -> None:
    starts = datetime(2026, 7, 21, 12, 0, tzinfo=UTC)
    status = resolve_booking_status_for_auto_confirm(
        {"auto_confirm_bookings": True, "auto_confirm_within_hours": 0},
        starts_at=starts,
        now=starts - timedelta(days=3),
    )
    assert status == BookingStatus.confirmed


def test_auto_confirm_window_confirms_near_term() -> None:
    now = datetime(2026, 7, 21, 10, 0, tzinfo=UTC)
    starts = now + timedelta(hours=12)
    status = resolve_booking_status_for_auto_confirm(
        {"auto_confirm_bookings": True, "auto_confirm_within_hours": 24},
        starts_at=starts,
        now=now,
    )
    assert status == BookingStatus.confirmed


def test_auto_confirm_window_leaves_far_bookings_pending() -> None:
    now = datetime(2026, 7, 21, 10, 0, tzinfo=UTC)
    starts = now + timedelta(hours=48)
    status = resolve_booking_status_for_auto_confirm(
        {"auto_confirm_bookings": True, "auto_confirm_within_hours": 24},
        starts_at=starts,
        now=now,
    )
    assert status == BookingStatus.pending
