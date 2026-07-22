import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.models.user import User
from app.repositories.conversation_repository import ConversationFilter
from app.schemas.messaging import (
    ConversationDetail,
    ConversationListItem,
    ConversationListResponse,
    CreateConversationRequest,
    InboxMessageCreate,
    InboxMessageRead,
)
from app.services.messaging_service import MessagingService

router = APIRouter(prefix="/me/messages", tags=["me-messages"])


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    filter: ConversationFilter = Query(default=ConversationFilter.all),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    return await MessagingService(db).list_conversations_client(
        current_user.id, status_filter=filter, page=page, limit=limit
    )


@router.post(
    "/conversations",
    response_model=ConversationListItem,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: CreateConversationRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationListItem:
    return await MessagingService(db).create_or_get_conversation_client(
        current_user, payload.business_id
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    return await MessagingService(db).get_conversation_client(
        current_user.id, conversation_id
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=InboxMessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: InboxMessageCreate,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> InboxMessageRead:
    return await MessagingService(db).send_message_client(
        current_user.id, conversation_id, payload.body
    )


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    conversation_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await MessagingService(db).mark_read_client(current_user.id, conversation_id)


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    return await MessagingService(db).get_unread_summary_client(current_user.id)
