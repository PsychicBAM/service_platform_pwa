import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ConversationContextType, ConversationStatus
from app.models.mixins import TimestampMixin


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "client_id",
            "context_type",
            name="uq_conversations_business_client_context",
        ),
        Index("ix_conversations_business_id", "business_id"),
        Index("ix_conversations_client_id", "client_id"),
        Index("ix_conversations_last_message_at", "last_message_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    context_type: Mapped[ConversationContextType] = mapped_column(
        Enum(ConversationContextType, name="conversation_context_type", native_enum=True),
        nullable=False,
        default=ConversationContextType.general,
        server_default=ConversationContextType.general.value,
    )
    context_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[ConversationStatus] = mapped_column(
        Enum(ConversationStatus, name="conversation_status", native_enum=True),
        nullable=False,
        default=ConversationStatus.open,
        server_default=ConversationStatus.open.value,
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_message_preview: Mapped[str | None] = mapped_column(String(500), nullable=True)

    business: Mapped["Business"] = relationship(back_populates="conversations")
    client: Mapped["Client"] = relationship(back_populates="conversations")
    messages: Mapped[list["InboxMessage"]] = relationship(
        back_populates="conversation",
        order_by="InboxMessage.created_at",
    )
