from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import InvalidOrderStatusTransitionError, NotFoundError
from app.models.enums import OrderStatus
from app.models.order import Order
from app.models.user import User
from app.repositories.order_repository import OrderRepository, UserOrderStatusFilter
from app.services.order_message_service import OrderMessageService
from app.schemas.order import (
    MyOrderBusinessSummary,
    MyOrderDetail,
    MyOrderListItem,
    MyOrderListMeta,
    MyOrderListResponse,
    MyOrderServiceSummary,
)

CLIENT_CANCELLABLE_STATUSES = {
    OrderStatus.submitted,
    OrderStatus.accepted,
    OrderStatus.in_progress,
}


def can_client_cancel_order(order: Order) -> bool:
    return order.status in CLIENT_CANCELLABLE_STATUSES


class ClientOrderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = OrderRepository(session)

    async def list_my_orders(
        self,
        user: User,
        *,
        status_filter: UserOrderStatusFilter | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> MyOrderListResponse:
        orders = await self.repo.list_for_user(
            user.id,
            status_filter=status_filter,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_for_user(user.id, status_filter=status_filter)
        previews = await OrderMessageService(self.session).get_last_message_previews(
            [o.id for o in orders]
        )
        return MyOrderListResponse(
            data=[self._to_list_item(o, previews.get(o.id)) for o in orders],
            meta=MyOrderListMeta(page=page, limit=limit, total=total),
        )

    async def get_my_order(
        self,
        user: User,
        order_id: uuid.UUID,
    ) -> MyOrderDetail:
        order = await self.repo.get_for_user(user.id, order_id)
        if order is None:
            raise NotFoundError("Order not found.")
        return self._to_detail(order)

    async def cancel_my_order(
        self,
        user: User,
        order_id: uuid.UUID,
        *,
        reason: str | None,
    ) -> MyOrderDetail:
        order = await self.repo.get_for_user(user.id, order_id)
        if order is None:
            raise NotFoundError("Order not found.")

        if order.status not in CLIENT_CANCELLABLE_STATUSES:
            raise InvalidOrderStatusTransitionError(
                f"Cannot cancel order with status '{order.status.value}'."
            )

        # TODO: send cancellation notification when notification service exists.
        await self.repo.cancel_by_client(order, reason=reason)
        await self.session.commit()
        order = await self.repo.get_for_user(user.id, order_id)
        assert order is not None
        return self._to_detail(order)

    def _to_list_item(
        self,
        order: Order,
        last_message_preview: str | None = None,
    ) -> MyOrderListItem:
        return MyOrderListItem(
            id=order.id,
            reference=order.reference,
            status=order.status,
            business=MyOrderBusinessSummary(
                id=order.business.id,
                name=order.business.name,
                slug=order.business.slug,
            ),
            service=MyOrderServiceSummary(
                id=order.service.id,
                name=order.service.name,
                type=order.service.type,
                price_cents=order.service.price_cents,
                price_type=order.service.price_type,
                currency=order.service.currency,
            ),
            created_at=order.created_at,
            updated_at=order.updated_at,
            last_message_preview=last_message_preview,
            can_cancel=can_client_cancel_order(order),
        )

    def _to_detail(self, order: Order) -> MyOrderDetail:
        return MyOrderDetail(
            id=order.id,
            reference=order.reference,
            status=order.status,
            business=MyOrderBusinessSummary(
                id=order.business.id,
                name=order.business.name,
                slug=order.business.slug,
            ),
            service=MyOrderServiceSummary(
                id=order.service.id,
                name=order.service.name,
                type=order.service.type,
                price_cents=order.service.price_cents,
                price_type=order.service.price_type,
                currency=order.service.currency,
            ),
            form_data=order.form_data,
            quoted_price_cents=order.quoted_price_cents,
            decline_reason=order.decline_reason,
            created_at=order.created_at,
            updated_at=order.updated_at,
            accepted_at=order.accepted_at,
            completed_at=order.completed_at,
            can_cancel=can_client_cancel_order(order),
        )
