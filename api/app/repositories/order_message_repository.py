import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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

    async def create(self, message: OrderMessage) -> OrderMessage:
        self.session.add(message)
        await self.session.flush()
        return message

    async def mark_read(self, message: OrderMessage) -> OrderMessage:
        message.read_at = datetime.now(UTC)
        await self.session.flush()
        return message
