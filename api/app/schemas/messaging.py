import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import (
    ConversationContextType,
    ConversationStatus,
    InboxMessageSenderType,
)


class InboxMessageRead(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_type: InboxMessageSenderType
    sender_user_id: uuid.UUID | None
    body: str
    read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InboxMessageCreate(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def validate_body(cls, value: str) -> str:
        body = value.strip()
        if not body:
            raise ValueError("body must not be empty")
        if len(body) > 5000:
            raise ValueError("body must not exceed 5000 characters")
        return body


class ConversationClientSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str | None
    phone: str | None

    model_config = ConfigDict(from_attributes=True)


class ConversationBusinessSummary(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    logo_url: str | None

    model_config = ConfigDict(from_attributes=True)


class ConversationListItem(BaseModel):
    id: uuid.UUID
    status: ConversationStatus
    context_type: ConversationContextType
    context_id: uuid.UUID | None
    subject: str | None
    last_message_at: datetime | None
    last_message_preview: str | None
    unread_count: int
    client: ConversationClientSummary | None = None
    business: ConversationBusinessSummary | None = None
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationListItem):
    messages: list[InboxMessageRead]


class ConversationListMeta(BaseModel):
    total: int
    page: int
    limit: int
    unread_total: int


class ConversationListResponse(BaseModel):
    items: list[ConversationListItem]
    meta: ConversationListMeta


class CreateConversationRequest(BaseModel):
    business_id: uuid.UUID
