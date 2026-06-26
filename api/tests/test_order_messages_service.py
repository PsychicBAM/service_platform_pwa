import pytest

from app.exceptions.business import OrderMessagesClosedError
from app.models.enums import OrderStatus
from app.services.order_message_service import (
    is_messaging_open,
    trim_message_preview,
    _ensure_messaging_open,
)


@pytest.mark.parametrize(
    "status",
    [
        OrderStatus.submitted,
        OrderStatus.pending_payment,
        OrderStatus.accepted,
        OrderStatus.in_progress,
    ],
)
def test_is_messaging_open_for_active_statuses(status: OrderStatus) -> None:
    assert is_messaging_open(status) is True


@pytest.mark.parametrize(
    "status",
    [OrderStatus.completed, OrderStatus.declined, OrderStatus.cancelled],
)
def test_is_messaging_open_false_for_terminal_statuses(status: OrderStatus) -> None:
    assert is_messaging_open(status) is False


def test_ensure_messaging_open_raises_for_completed() -> None:
    with pytest.raises(OrderMessagesClosedError):
        _ensure_messaging_open(OrderStatus.completed)


def test_trim_message_preview_short_text() -> None:
    assert trim_message_preview("Hello") == "Hello"


def test_trim_message_preview_long_text() -> None:
    body = "x" * 150
    preview = trim_message_preview(body)
    assert len(preview) == 120
    assert preview.endswith("...")
