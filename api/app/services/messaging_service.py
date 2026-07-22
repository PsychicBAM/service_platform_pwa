import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import BusinessNotFoundError, ConversationNotFoundError
from app.models.client import Client
from app.models.conversation import Conversation
from app.models.enums import ClientSource, ConversationStatus, InboxMessageSenderType
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.conversation_repository import (
    ConversationFilter,
    ConversationRepository,
)
from app.repositories.inbox_message_repository import InboxMessageRepository
from app.schemas.messaging import (
    ConversationBusinessSummary,
    ConversationClientSummary,
    ConversationDetail,
    ConversationListItem,
    ConversationListMeta,
    ConversationListResponse,
    InboxMessageRead,
)


def _preview(body: str) -> str:
    return body if len(body) <= 200 else f"{body[:197]}..."


class MessagingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        self.client_repo = ClientRepository(session)
        self.conversation_repo = ConversationRepository(session)
        self.message_repo = InboxMessageRepository(session)

    async def list_conversations_admin(
        self,
        business_id: uuid.UUID,
        *,
        status_filter: ConversationFilter,
        search: str | None,
        page: int,
        limit: int,
    ) -> ConversationListResponse:
        conversations, total = await self.conversation_repo.list_for_business(
            business_id,
            status_filter=status_filter,
            search=search,
            page=page,
            limit=limit,
        )
        items = [
            await self._conversation_item(conversation, for_business=True)
            for conversation in conversations
        ]
        return ConversationListResponse(
            items=items,
            meta=ConversationListMeta(
                total=total,
                page=page,
                limit=limit,
                unread_total=await self.conversation_repo.count_unread_for_business(
                    business_id
                ),
            ),
        )

    async def get_conversation_admin(
        self, business_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> ConversationDetail:
        conversation = await self._admin_conversation(business_id, conversation_id)
        await self.message_repo.mark_read_for_business(conversation.id)
        messages = await self.message_repo.list_for_conversation(conversation.id)
        await self.session.commit()
        item = await self._conversation_item(conversation, for_business=True)
        return ConversationDetail(
            **item.model_dump(),
            messages=[InboxMessageRead.model_validate(message) for message in messages],
        )

    async def send_message_admin(
        self,
        business_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        body: str,
    ) -> InboxMessageRead:
        conversation = await self._admin_conversation(business_id, conversation_id)
        message = await self._send(
            conversation.id,
            business_id,
            InboxMessageSenderType.business,
            user_id,
            body,
        )
        return InboxMessageRead.model_validate(message)

    async def mark_read_admin(
        self, business_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> None:
        conversation = await self._admin_conversation(business_id, conversation_id)
        await self.message_repo.mark_read_for_business(conversation.id)
        await self.session.commit()

    async def archive_conversation_admin(
        self,
        business_id: uuid.UUID,
        conversation_id: uuid.UUID,
        *,
        archived: bool,
    ) -> ConversationListItem:
        conversation = await self._admin_conversation(business_id, conversation_id)
        conversation.status = (
            ConversationStatus.archived if archived else ConversationStatus.open
        )
        await self.session.commit()
        await self.session.refresh(conversation)
        return await self._conversation_item(conversation, for_business=True)

    async def mark_unread_admin(
        self, business_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> None:
        conversation = await self._admin_conversation(business_id, conversation_id)
        await self.message_repo.mark_unread_for_business(conversation.id)
        await self.session.commit()

    async def list_conversations_client(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: ConversationFilter,
        page: int,
        limit: int,
    ) -> ConversationListResponse:
        conversations, total = await self.conversation_repo.list_for_user(
            user_id, status_filter=status_filter, page=page, limit=limit
        )
        items = [
            await self._conversation_item(conversation, for_business=False)
            for conversation in conversations
        ]
        return ConversationListResponse(
            items=items,
            meta=ConversationListMeta(
                total=total,
                page=page,
                limit=limit,
                unread_total=await self.conversation_repo.count_unread_for_user(user_id),
            ),
        )

    async def get_conversation_client(
        self, user_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> ConversationDetail:
        conversation = await self._client_conversation(user_id, conversation_id)
        await self.message_repo.mark_read_for_client(conversation.id)
        messages = await self.message_repo.list_for_conversation(conversation.id)
        await self.session.commit()
        item = await self._conversation_item(conversation, for_business=False)
        return ConversationDetail(
            **item.model_dump(),
            messages=[InboxMessageRead.model_validate(message) for message in messages],
        )

    async def create_or_get_conversation_client(
        self, user: User, business_id: uuid.UUID
    ) -> ConversationListItem:
        business = await self.business_repo.get_by_id(business_id)
        if business is None:
            raise BusinessNotFoundError()
        client = (
            await self.session.execute(
                select(Client).where(
                    Client.business_id == business_id, Client.user_id == user.id
                )
            )
        ).scalar_one_or_none()
        if client is None:
            client = await self.client_repo.get_or_create_guest_client(
                business_id,
                full_name=(user.full_name or user.email).strip(),
                email=user.email,
                phone=user.phone,
                attach_user_id=user.id,
            )
            client.source = ClientSource.registered
        conversation = await self.conversation_repo.get_or_create_general(
            business_id, client.id
        )
        await self.session.commit()
        conversation = await self.conversation_repo.get_for_user(user.id, conversation.id)
        if conversation is None:  # pragma: no cover - defensive ownership invariant
            raise ConversationNotFoundError()
        return await self._conversation_item(conversation, for_business=False)

    async def send_message_client(
        self, user_id: uuid.UUID, conversation_id: uuid.UUID, body: str
    ) -> InboxMessageRead:
        conversation = await self._client_conversation(user_id, conversation_id)
        message = await self._send(
            conversation.id,
            conversation.business_id,
            InboxMessageSenderType.client,
            user_id,
            body,
        )
        return InboxMessageRead.model_validate(message)

    async def mark_read_client(
        self, user_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> None:
        conversation = await self._client_conversation(user_id, conversation_id)
        await self.message_repo.mark_read_for_client(conversation.id)
        await self.session.commit()

    async def get_unread_summary_admin(self, business_id: uuid.UUID) -> dict[str, int]:
        return {
            "unread_total": await self.conversation_repo.count_unread_for_business(
                business_id
            )
        }

    async def get_unread_summary_client(self, user_id: uuid.UUID) -> dict[str, int]:
        return {
            "unread_total": await self.conversation_repo.count_unread_for_user(user_id)
        }

    async def _send(
        self,
        conversation_id: uuid.UUID,
        business_id: uuid.UUID,
        sender_type: InboxMessageSenderType,
        sender_user_id: uuid.UUID,
        body: str,
    ):
        message = await self.message_repo.create_message(
            conversation_id, business_id, sender_type, sender_user_id, body
        )
        await self.session.refresh(message)
        conversation = await self.session.get(Conversation, conversation_id)
        conversation.last_message_at = message.created_at
        conversation.last_message_preview = _preview(body)
        conversation.status = ConversationStatus.open
        await self.session.commit()
        return message

    async def _admin_conversation(
        self, business_id: uuid.UUID, conversation_id: uuid.UUID
    ):
        conversation = await self.conversation_repo.get_for_business(
            business_id, conversation_id
        )
        if conversation is None:
            raise ConversationNotFoundError()
        return conversation

    async def _client_conversation(self, user_id: uuid.UUID, conversation_id: uuid.UUID):
        conversation = await self.conversation_repo.get_for_user(user_id, conversation_id)
        if conversation is None:
            raise ConversationNotFoundError()
        return conversation

    async def _conversation_item(self, conversation, *, for_business: bool):
        unread_count = (
            await self.message_repo.count_unread_in_conversation_for_business(conversation.id)
            if for_business
            else await self.message_repo.count_unread_in_conversation_for_client(conversation.id)
        )
        return ConversationListItem(
            id=conversation.id,
            status=conversation.status,
            context_type=conversation.context_type,
            context_id=conversation.context_id,
            subject=conversation.subject,
            last_message_at=conversation.last_message_at,
            last_message_preview=conversation.last_message_preview,
            unread_count=unread_count,
            client=ConversationClientSummary.model_validate(conversation.client),
            business=ConversationBusinessSummary.model_validate(conversation.business),
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )
