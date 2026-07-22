import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import InboxMessageSenderType
from app.models.inbox_message import InboxMessage


class InboxMessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_conversation(
        self, conversation_id: uuid.UUID, *, page: int = 1, limit: int = 50
    ) -> list[InboxMessage]:
        stmt = (
            select(InboxMessage)
            .where(InboxMessage.conversation_id == conversation_id)
            .order_by(InboxMessage.created_at.asc())
            .offset(max(page - 1, 0) * limit)
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def create_message(
        self,
        conversation_id: uuid.UUID,
        business_id: uuid.UUID,
        sender_type: InboxMessageSenderType,
        sender_user_id: uuid.UUID | None,
        body: str,
    ) -> InboxMessage:
        message = InboxMessage(
            conversation_id=conversation_id,
            business_id=business_id,
            sender_type=sender_type,
            sender_user_id=sender_user_id,
            body=body,
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def mark_read_for_business(self, conversation_id: uuid.UUID) -> None:
        await self.session.execute(
            update(InboxMessage)
            .where(
                InboxMessage.conversation_id == conversation_id,
                InboxMessage.sender_type == InboxMessageSenderType.client,
                InboxMessage.read_at.is_(None),
            )
            .values(read_at=datetime.now(UTC))
        )

    async def mark_read_for_client(self, conversation_id: uuid.UUID) -> None:
        await self.session.execute(
            update(InboxMessage)
            .where(
                InboxMessage.conversation_id == conversation_id,
                InboxMessage.sender_type == InboxMessageSenderType.business,
                InboxMessage.read_at.is_(None),
            )
            .values(read_at=datetime.now(UTC))
        )

    async def mark_unread_for_business(self, conversation_id: uuid.UUID) -> None:
        latest_id = (
            select(InboxMessage.id)
            .where(
                InboxMessage.conversation_id == conversation_id,
                InboxMessage.sender_type == InboxMessageSenderType.client,
            )
            .order_by(InboxMessage.created_at.desc())
            .limit(1)
            .scalar_subquery()
        )
        await self.session.execute(
            update(InboxMessage).where(InboxMessage.id == latest_id).values(read_at=None)
        )

    async def count_unread_in_conversation_for_business(
        self, conversation_id: uuid.UUID
    ) -> int:
        stmt = select(func.count()).select_from(InboxMessage).where(
            InboxMessage.conversation_id == conversation_id,
            InboxMessage.sender_type == InboxMessageSenderType.client,
            InboxMessage.read_at.is_(None),
        )
        return int((await self.session.execute(stmt)).scalar_one())

    async def count_unread_in_conversation_for_client(
        self, conversation_id: uuid.UUID
    ) -> int:
        stmt = select(func.count()).select_from(InboxMessage).where(
            InboxMessage.conversation_id == conversation_id,
            InboxMessage.sender_type == InboxMessageSenderType.business,
            InboxMessage.read_at.is_(None),
        )
        return int((await self.session.execute(stmt)).scalar_one())
