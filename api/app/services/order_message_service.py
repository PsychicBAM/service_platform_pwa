from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import OrderMessagesClosedError, OrderNotFoundError
from app.models.business import Business
from app.models.enums import OrderMessageSenderType, OrderStatus
from app.models.user import User
from app.repositories.order_message_repository import OrderMessageRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.order import (
    ORDER_MESSAGE_PREVIEW_LENGTH,
    OrderMessageListMeta,
    OrderMessageListResponse,
    OrderMessageRead,
)
from app.services.email_notification_service import EmailNotificationService

MESSAGING_OPEN_STATUSES = {
    OrderStatus.submitted,
    OrderStatus.pending_payment,
    OrderStatus.accepted,
    OrderStatus.in_progress,
}


def trim_message_preview(body: str, max_len: int = ORDER_MESSAGE_PREVIEW_LENGTH) -> str:
    text = body.strip()
    if len(text) <= max_len:
        return text
    return f"{text[: max_len - 3]}..."


def is_messaging_open(status: OrderStatus) -> bool:
    return status in MESSAGING_OPEN_STATUSES


def _ensure_messaging_open(status: OrderStatus) -> None:
    if not is_messaging_open(status):
        raise OrderMessagesClosedError()


class OrderMessageService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.order_repo = OrderRepository(session)
        self.message_repo = OrderMessageRepository(session)

    async def list_order_messages_for_user(
        self,
        user_id: uuid.UUID,
        order_id: uuid.UUID,
        *,
        page: int = 1,
        limit: int = 50,
    ) -> OrderMessageListResponse:
        order = await self.order_repo.get_for_user(user_id, order_id)
        if order is None:
            raise OrderNotFoundError()
        return await self._list_messages(order_id, page=page, limit=limit)

    async def send_order_message_as_client(
        self,
        user_id: uuid.UUID,
        order_id: uuid.UUID,
        body: str,
    ) -> OrderMessageRead:
        order = await self.order_repo.get_for_user(user_id, order_id)
        if order is None:
            raise OrderNotFoundError()
        _ensure_messaging_open(order.status)

        message = await self.message_repo.create_message(
            order.id,
            order.business_id,
            OrderMessageSenderType.client,
            user_id,
            body,
        )
        await self.session.commit()
        await self.session.refresh(message)
        EmailNotificationService().notify_order_message_received(
            order,
            message,
            business=order.business,
        )
        return OrderMessageRead.model_validate(message)

    async def list_order_messages_for_admin(
        self,
        business_id: uuid.UUID,
        order_id: uuid.UUID,
        *,
        page: int = 1,
        limit: int = 50,
    ) -> OrderMessageListResponse:
        order = await self.order_repo.get_detail_for_business(business_id, order_id)
        if order is None:
            raise OrderNotFoundError()
        return await self._list_messages(order_id, page=page, limit=limit)

    async def send_order_message_as_admin(
        self,
        business: Business,
        admin_user_id: uuid.UUID,
        order_id: uuid.UUID,
        body: str,
    ) -> OrderMessageRead:
        order = await self.order_repo.get_detail_for_business(business.id, order_id)
        if order is None:
            raise OrderNotFoundError()
        _ensure_messaging_open(order.status)

        message = await self.message_repo.create_message(
            order.id,
            business.id,
            OrderMessageSenderType.admin,
            admin_user_id,
            body,
        )
        await self.session.commit()
        await self.session.refresh(message)
        order.business = business
        EmailNotificationService().notify_order_message_received(
            order,
            message,
            business=business,
        )
        return OrderMessageRead.model_validate(message)

    async def get_last_message_previews(
        self,
        order_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, str]:
        latest = await self.message_repo.get_last_messages_for_orders(order_ids)
        return {
            order_id: trim_message_preview(message.body)
            for order_id, message in latest.items()
        }

    async def _list_messages(
        self,
        order_id: uuid.UUID,
        *,
        page: int,
        limit: int,
    ) -> OrderMessageListResponse:
        messages = await self.message_repo.list_for_order(
            order_id,
            page=page,
            limit=limit,
        )
        total = await self.message_repo.count_for_order(order_id)
        return OrderMessageListResponse(
            data=[OrderMessageRead.model_validate(m) for m in messages],
            meta=OrderMessageListMeta(page=page, limit=limit, total=total),
        )
