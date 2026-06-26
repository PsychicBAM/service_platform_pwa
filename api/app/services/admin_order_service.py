from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    InvalidOrderStatusTransitionError,
    OrderDeclineReasonRequiredError,
    OrderNotFoundError,
)
from app.models.business import Business
from app.models.enums import OrderStatus
from app.models.order import Order
from app.repositories.order_repository import OrderRepository
from app.schemas.order import (
    AdminOrderAcceptRequest,
    AdminOrderDeclineRequest,
    AdminOrderListItem,
    AdminOrderListMeta,
    AdminOrderListResponse,
    AdminOrderRead,
    AdminOrderUpdate,
)


ALLOWED_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.submitted: {
        OrderStatus.accepted,
        OrderStatus.in_progress,
        OrderStatus.declined,
        OrderStatus.cancelled,
    },
    OrderStatus.accepted: {
        OrderStatus.in_progress,
        OrderStatus.cancelled,
    },
    OrderStatus.in_progress: {
        OrderStatus.completed,
        OrderStatus.cancelled,
    },
}

ACCEPTABLE_STATUSES = {OrderStatus.submitted}

DECLINEABLE_STATUSES = {OrderStatus.submitted}

IN_PROGRESS_STATUSES = {OrderStatus.submitted, OrderStatus.accepted}

COMPLETABLE_STATUSES = {OrderStatus.in_progress}

CANCELLABLE_STATUSES = {
    OrderStatus.submitted,
    OrderStatus.accepted,
    OrderStatus.in_progress,
}


def validate_status_transition(
    current: OrderStatus,
    new_status: OrderStatus,
) -> None:
    if current == new_status:
        return
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise InvalidOrderStatusTransitionError(
            f"Cannot transition order from '{current.value}' to '{new_status.value}'."
        )


class AdminOrderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = OrderRepository(session)

    async def list_admin_orders(
        self,
        business: Business,
        *,
        status: OrderStatus | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> AdminOrderListResponse:
        orders = await self.repo.list_for_business(
            business.id,
            status=status,
            search=search,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_for_business(
            business.id,
            status=status,
            search=search,
        )
        return AdminOrderListResponse(
            data=[AdminOrderListItem.from_order(o) for o in orders],
            meta=AdminOrderListMeta(page=page, limit=limit, total=total),
        )

    async def get_admin_order(
        self,
        business: Business,
        order_id: uuid.UUID,
    ) -> AdminOrderRead:
        order = await self._get_order_or_404(business.id, order_id)
        return AdminOrderRead.from_order(order)

    async def update_admin_order(
        self,
        business: Business,
        order_id: uuid.UUID,
        payload: AdminOrderUpdate,
    ) -> AdminOrderRead:
        order = await self._get_order_or_404(business.id, order_id)
        data = payload.model_dump(exclude_unset=True)
        if data:
            await self.repo.update_order(order, data)
        await self.session.commit()
        order = await self._get_order_or_404(business.id, order_id)
        return AdminOrderRead.from_order(order)

    async def accept_admin_order(
        self,
        business: Business,
        order_id: uuid.UUID,
        payload: AdminOrderAcceptRequest,
    ) -> AdminOrderRead:
        order = await self._get_order_or_404(business.id, order_id)
        if order.status not in ACCEPTABLE_STATUSES:
            raise InvalidOrderStatusTransitionError(
                f"Cannot accept order with status '{order.status.value}'."
            )

        new_status = (
            OrderStatus.in_progress if payload.start_work else OrderStatus.accepted
        )
        validate_status_transition(order.status, new_status)

        data: dict = {"status": new_status}
        if order.accepted_at is None:
            data["accepted_at"] = datetime.now(UTC)
        if payload.quoted_price_cents is not None:
            data["quoted_price_cents"] = payload.quoted_price_cents
        if payload.admin_notes is not None:
            data["admin_notes"] = payload.admin_notes

        # TODO: send order accepted notification when notification service exists.
        await self.repo.update_order(order, data)
        await self.session.commit()
        order = await self._get_order_or_404(business.id, order_id)
        return AdminOrderRead.from_order(order)

    async def decline_admin_order(
        self,
        business: Business,
        order_id: uuid.UUID,
        payload: AdminOrderDeclineRequest,
    ) -> AdminOrderRead:
        order = await self._get_order_or_404(business.id, order_id)
        if order.status not in DECLINEABLE_STATUSES:
            raise InvalidOrderStatusTransitionError(
                f"Cannot decline order with status '{order.status.value}'."
            )

        reason = payload.decline_reason.strip()
        if not reason:
            raise OrderDeclineReasonRequiredError()

        validate_status_transition(order.status, OrderStatus.declined)

        data: dict = {
            "status": OrderStatus.declined,
            "decline_reason": reason,
        }
        if payload.admin_notes is not None:
            data["admin_notes"] = payload.admin_notes

        # TODO: send order declined notification when notification service exists.
        await self.repo.update_order(order, data)
        await self.session.commit()
        order = await self._get_order_or_404(business.id, order_id)
        return AdminOrderRead.from_order(order)

    async def mark_order_in_progress(
        self,
        business: Business,
        order_id: uuid.UUID,
    ) -> AdminOrderRead:
        order = await self._get_order_or_404(business.id, order_id)
        if order.status not in IN_PROGRESS_STATUSES:
            raise InvalidOrderStatusTransitionError(
                f"Cannot mark order in progress with status '{order.status.value}'."
            )

        validate_status_transition(order.status, OrderStatus.in_progress)

        data: dict = {"status": OrderStatus.in_progress}
        if order.accepted_at is None:
            data["accepted_at"] = datetime.now(UTC)

        # TODO: send order in-progress notification when notification service exists.
        await self.repo.update_order(order, data)
        await self.session.commit()
        order = await self._get_order_or_404(business.id, order_id)
        return AdminOrderRead.from_order(order)

    async def complete_admin_order(
        self,
        business: Business,
        order_id: uuid.UUID,
    ) -> AdminOrderRead:
        order = await self._get_order_or_404(business.id, order_id)
        if order.status not in COMPLETABLE_STATUSES:
            raise InvalidOrderStatusTransitionError(
                f"Cannot complete order with status '{order.status.value}'."
            )

        validate_status_transition(order.status, OrderStatus.completed)

        # TODO: send order completed notification when notification service exists.
        await self.repo.update_order(
            order,
            {
                "status": OrderStatus.completed,
                "completed_at": datetime.now(UTC),
            },
        )
        await self.session.commit()
        order = await self._get_order_or_404(business.id, order_id)
        return AdminOrderRead.from_order(order)

    async def cancel_admin_order(
        self,
        business: Business,
        order_id: uuid.UUID,
        *,
        reason: str | None,
    ) -> AdminOrderRead:
        order = await self._get_order_or_404(business.id, order_id)
        if order.status not in CANCELLABLE_STATUSES:
            raise InvalidOrderStatusTransitionError(
                f"Cannot cancel order with status '{order.status.value}'."
            )

        validate_status_transition(order.status, OrderStatus.cancelled)

        data: dict = {"status": OrderStatus.cancelled}
        if reason:
            data["admin_notes"] = reason

        # TODO: send order cancelled notification when notification service exists.
        await self.repo.update_order(order, data)
        await self.session.commit()
        order = await self._get_order_or_404(business.id, order_id)
        return AdminOrderRead.from_order(order)

    async def _get_order_or_404(
        self,
        business_id: uuid.UUID,
        order_id: uuid.UUID,
    ) -> Order:
        order = await self.repo.get_detail_for_business(business_id, order_id)
        if order is None:
            raise OrderNotFoundError()
        return order
