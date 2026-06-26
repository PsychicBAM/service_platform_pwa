import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import OrderMessageSenderType
from app.models.order_message import OrderMessage


class OrderMessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_order(
        self,
        order_id: uuid.UUID,
        *,
        page: int = 1,
        limit: int = 50,
    ) -> list[OrderMessage]:
        stmt = (
            select(OrderMessage)
            .where(OrderMessage.order_id == order_id)
            .order_by(OrderMessage.created_at.asc())
        )
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_order(self, order_id: uuid.UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(OrderMessage)
            .where(OrderMessage.order_id == order_id)
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def create_message(
        self,
        order_id: uuid.UUID,
        business_id: uuid.UUID,
        sender_type: OrderMessageSenderType,
        sender_user_id: uuid.UUID | None,
        body: str,
    ) -> OrderMessage:
        message = OrderMessage(
            order_id=order_id,
            business_id=business_id,
            sender_type=sender_type,
            sender_user_id=sender_user_id,
            body=body,
        )
        return await self.create(message)

    async def get_last_message_for_order(
        self,
        order_id: uuid.UUID,
    ) -> OrderMessage | None:
        stmt = (
            select(OrderMessage)
            .where(OrderMessage.order_id == order_id)
            .order_by(OrderMessage.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_last_messages_for_orders(
        self,
        order_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, OrderMessage]:
        if not order_ids:
            return {}
        stmt = (
            select(OrderMessage)
            .where(OrderMessage.order_id.in_(order_ids))
            .order_by(OrderMessage.order_id, OrderMessage.created_at.desc())
        )
        result = await self.session.execute(stmt)
        latest: dict[uuid.UUID, OrderMessage] = {}
        for message in result.scalars().all():
            if message.order_id not in latest:
                latest[message.order_id] = message
        return latest

    async def create(self, message: OrderMessage) -> OrderMessage:
        self.session.add(message)
        await self.session.flush()
        return message

    async def mark_read(self, message: OrderMessage) -> OrderMessage:
        message.read_at = datetime.now(UTC)
        await self.session.flush()
        return message
