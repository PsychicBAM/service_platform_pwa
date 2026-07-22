import uuid
from enum import Enum

from sqlalchemy import exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.client import Client
from app.models.conversation import Conversation
from app.models.enums import (
    ConversationContextType,
    ConversationStatus,
    InboxMessageSenderType,
)
from app.models.inbox_message import InboxMessage


class ConversationFilter(str, Enum):
    all = "all"
    unread = "unread"
    archived = "archived"


class ConversationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _apply_filter(self, stmt, status_filter: ConversationFilter):
        unread_exists = exists(
            select(InboxMessage.id).where(
                InboxMessage.conversation_id == Conversation.id,
                InboxMessage.sender_type == InboxMessageSenderType.client,
                InboxMessage.read_at.is_(None),
            )
        )
        if status_filter == ConversationFilter.archived:
            return stmt.where(Conversation.status == ConversationStatus.archived)
        if status_filter == ConversationFilter.unread:
            return stmt.where(
                Conversation.status == ConversationStatus.open,
                unread_exists,
            )
        return stmt.where(Conversation.status != ConversationStatus.archived)

    def _apply_search(self, stmt, search: str | None):
        if not search or not search.strip():
            return stmt
        term = f"%{search.strip()}%"
        return stmt.join(Conversation.client).where(
            or_(
                Client.full_name.ilike(term),
                Client.email.ilike(term),
                Client.phone.ilike(term),
                Conversation.subject.ilike(term),
                Conversation.last_message_preview.ilike(term),
            )
        )

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status_filter: ConversationFilter = ConversationFilter.all,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Conversation], int]:
        base = select(Conversation).where(Conversation.business_id == business_id)
        base = self._apply_filter(base, status_filter)
        base = self._apply_search(base, search)
        count_stmt = select(func.count()).select_from(base.order_by(None).subquery())
        total = int((await self.session.execute(count_stmt)).scalar_one())
        stmt = (
            base.options(
                selectinload(Conversation.client),
                selectinload(Conversation.business),
            )
            .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
            .offset(max(page - 1, 0) * limit)
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all()), total

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: ConversationFilter = ConversationFilter.all,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Conversation], int]:
        base = select(Conversation).join(Conversation.client).where(Client.user_id == user_id)
        if status_filter == ConversationFilter.archived:
            base = base.where(Conversation.status == ConversationStatus.archived)
        elif status_filter == ConversationFilter.unread:
            base = base.where(
                Conversation.status == ConversationStatus.open,
                exists(
                    select(InboxMessage.id).where(
                        InboxMessage.conversation_id == Conversation.id,
                        InboxMessage.sender_type == InboxMessageSenderType.business,
                        InboxMessage.read_at.is_(None),
                    )
                ),
            )
        else:
            base = base.where(Conversation.status != ConversationStatus.archived)
        count_stmt = select(func.count()).select_from(base.order_by(None).subquery())
        total = int((await self.session.execute(count_stmt)).scalar_one())
        stmt = (
            base.options(
                selectinload(Conversation.client),
                selectinload(Conversation.business),
            )
            .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
            .offset(max(page - 1, 0) * limit)
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all()), total

    async def get_for_business(
        self, business_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> Conversation | None:
        stmt = (
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.business_id == business_id,
            )
            .options(selectinload(Conversation.client), selectinload(Conversation.business))
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_for_user(
        self, user_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> Conversation | None:
        stmt = (
            select(Conversation)
            .join(Conversation.client)
            .where(Conversation.id == conversation_id, Client.user_id == user_id)
            .options(selectinload(Conversation.client), selectinload(Conversation.business))
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_or_create_general(
        self, business_id: uuid.UUID, client_id: uuid.UUID
    ) -> Conversation:
        stmt = select(Conversation).where(
            Conversation.business_id == business_id,
            Conversation.client_id == client_id,
            Conversation.context_type == ConversationContextType.general,
        )
        existing = (await self.session.execute(stmt)).scalar_one_or_none()
        if existing is not None:
            return existing
        conversation = Conversation(business_id=business_id, client_id=client_id)
        self.session.add(conversation)
        await self.session.flush()
        return conversation

    async def count_unread_for_business(self, business_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(func.distinct(InboxMessage.conversation_id)))
            .join(Conversation, InboxMessage.conversation_id == Conversation.id)
            .where(
                InboxMessage.business_id == business_id,
                Conversation.status == ConversationStatus.open,
                InboxMessage.sender_type == InboxMessageSenderType.client,
                InboxMessage.read_at.is_(None),
            )
        )
        return int((await self.session.execute(stmt)).scalar_one())

    async def count_unread_for_user(self, user_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(func.distinct(InboxMessage.conversation_id)))
            .join(Conversation, InboxMessage.conversation_id == Conversation.id)
            .join(Client, Conversation.client_id == Client.id)
            .where(
                Client.user_id == user_id,
                Conversation.status == ConversationStatus.open,
                InboxMessage.sender_type == InboxMessageSenderType.business,
                InboxMessage.read_at.is_(None),
            )
        )
        return int((await self.session.execute(stmt)).scalar_one())
