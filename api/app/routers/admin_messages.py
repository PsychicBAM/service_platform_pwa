import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.user import User
from app.repositories.conversation_repository import ConversationFilter
from app.schemas.messaging import (
    ConversationDetail,
    ConversationListItem,
    ConversationListResponse,
    InboxMessageCreate,
    InboxMessageRead,
)
from app.services.messaging_service import MessagingService

router = APIRouter(prefix="/businesses/{business_id}/messages", tags=["admin-messages"])


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    business_id: uuid.UUID,
    filter: ConversationFilter = Query(default=ConversationFilter.all),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    business: Business = Depends(get_business_for_admin_or_403),
    _: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    return await MessagingService(db).list_conversations_admin(
        business.id, status_filter=filter, search=q, page=page, limit=limit
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    _: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    return await MessagingService(db).get_conversation_admin(business.id, conversation_id)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=InboxMessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: InboxMessageCreate,
    business: Business = Depends(get_business_for_admin_or_403),
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> InboxMessageRead:
    return await MessagingService(db).send_message_admin(
        business.id, current_user.id, conversation_id, payload.body
    )


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    conversation_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    _: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await MessagingService(db).mark_read_admin(business.id, conversation_id)


@router.post("/conversations/{conversation_id}/archive", response_model=ConversationListItem)
async def archive_conversation(
    conversation_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    _: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationListItem:
    return await MessagingService(db).archive_conversation_admin(
        business.id, conversation_id, archived=True
    )


@router.post("/conversations/{conversation_id}/unarchive", response_model=ConversationListItem)
async def unarchive_conversation(
    conversation_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    _: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationListItem:
    return await MessagingService(db).archive_conversation_admin(
        business.id, conversation_id, archived=False
    )


@router.post(
    "/conversations/{conversation_id}/mark-unread",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def mark_unread(
    conversation_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    _: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await MessagingService(db).mark_unread_admin(business.id, conversation_id)


@router.get("/unread-count")
async def unread_count(
    business: Business = Depends(get_business_for_admin_or_403),
    _: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    return await MessagingService(db).get_unread_summary_admin(business.id)
