import pytest

from app.exceptions.business import InvalidBookingStatusTransitionError
from app.models.enums import BookingStatus
from app.services.admin_booking_service import validate_status_transition


def test_pending_to_confirmed_allowed() -> None:
    validate_status_transition(BookingStatus.pending, BookingStatus.confirmed)


def test_pending_to_cancelled_allowed() -> None:
    validate_status_transition(BookingStatus.pending, BookingStatus.cancelled)


def test_confirmed_to_completed_allowed() -> None:
    validate_status_transition(BookingStatus.confirmed, BookingStatus.completed)


def test_confirmed_to_cancelled_allowed() -> None:
    validate_status_transition(BookingStatus.confirmed, BookingStatus.cancelled)


def test_confirmed_to_no_show_allowed() -> None:
    validate_status_transition(BookingStatus.confirmed, BookingStatus.no_show)


def test_cancelled_to_confirmed_rejected() -> None:
    with pytest.raises(InvalidBookingStatusTransitionError):
        validate_status_transition(BookingStatus.cancelled, BookingStatus.confirmed)


def test_completed_to_confirmed_rejected() -> None:
    with pytest.raises(InvalidBookingStatusTransitionError):
        validate_status_transition(BookingStatus.completed, BookingStatus.confirmed)


def test_no_show_to_confirmed_rejected() -> None:
    with pytest.raises(InvalidBookingStatusTransitionError):
        validate_status_transition(BookingStatus.no_show, BookingStatus.confirmed)


def test_pending_payment_to_confirmed_rejected() -> None:
    with pytest.raises(InvalidBookingStatusTransitionError):
        validate_status_transition(BookingStatus.pending_payment, BookingStatus.confirmed)
