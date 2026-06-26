import pytest

from app.models.enums import OrderStatus
from app.services.client_order_service import can_client_cancel_order


class _FakeOrder:
    def __init__(self, status: OrderStatus):
        self.status = status


@pytest.mark.parametrize(
    "status",
    [OrderStatus.submitted, OrderStatus.accepted, OrderStatus.in_progress],
)
def test_can_client_cancel_active_orders(status: OrderStatus) -> None:
    assert can_client_cancel_order(_FakeOrder(status)) is True


@pytest.mark.parametrize(
    "status",
    [
        OrderStatus.completed,
        OrderStatus.declined,
        OrderStatus.cancelled,
        OrderStatus.pending_payment,
    ],
)
def test_can_client_cancel_terminal_or_pending_payment_orders(status: OrderStatus) -> None:
    assert can_client_cancel_order(_FakeOrder(status)) is False
