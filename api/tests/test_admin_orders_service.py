import pytest

from app.exceptions.business import InvalidOrderStatusTransitionError
from app.models.enums import OrderStatus
from app.services.admin_order_service import validate_status_transition


def test_submitted_to_accepted_allowed() -> None:
    validate_status_transition(OrderStatus.submitted, OrderStatus.accepted)


def test_submitted_to_in_progress_allowed() -> None:
    validate_status_transition(OrderStatus.submitted, OrderStatus.in_progress)


def test_submitted_to_declined_allowed() -> None:
    validate_status_transition(OrderStatus.submitted, OrderStatus.declined)


def test_submitted_to_cancelled_allowed() -> None:
    validate_status_transition(OrderStatus.submitted, OrderStatus.cancelled)


def test_accepted_to_in_progress_allowed() -> None:
    validate_status_transition(OrderStatus.accepted, OrderStatus.in_progress)


def test_accepted_to_cancelled_allowed() -> None:
    validate_status_transition(OrderStatus.accepted, OrderStatus.cancelled)


def test_in_progress_to_completed_allowed() -> None:
    validate_status_transition(OrderStatus.in_progress, OrderStatus.completed)


def test_in_progress_to_cancelled_allowed() -> None:
    validate_status_transition(OrderStatus.in_progress, OrderStatus.cancelled)


def test_declined_to_accepted_rejected() -> None:
    with pytest.raises(InvalidOrderStatusTransitionError):
        validate_status_transition(OrderStatus.declined, OrderStatus.accepted)


def test_completed_to_in_progress_rejected() -> None:
    with pytest.raises(InvalidOrderStatusTransitionError):
        validate_status_transition(OrderStatus.completed, OrderStatus.in_progress)


def test_cancelled_to_accepted_rejected() -> None:
    with pytest.raises(InvalidOrderStatusTransitionError):
        validate_status_transition(OrderStatus.cancelled, OrderStatus.accepted)


def test_completed_to_cancelled_rejected() -> None:
    with pytest.raises(InvalidOrderStatusTransitionError):
        validate_status_transition(OrderStatus.completed, OrderStatus.cancelled)


def test_pending_payment_to_accepted_rejected() -> None:
    with pytest.raises(InvalidOrderStatusTransitionError):
        validate_status_transition(OrderStatus.pending_payment, OrderStatus.accepted)
