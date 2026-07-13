import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import WaitlistStatus
from app.models.mixins import TimestampMixin


class BookingWaitlistEntry(Base, TimestampMixin):
    __tablename__ = "booking_waitlist_entries"
    __table_args__ = (
        Index("ix_waitlist_business_id", "business_id"),
        Index("ix_waitlist_business_id_service_id", "business_id", "service_id"),
        Index(
            "ix_waitlist_business_id_service_id_starts_at",
            "business_id",
            "service_id",
            "starts_at",
        ),
        Index("ix_waitlist_business_id_status", "business_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[WaitlistStatus] = mapped_column(
        Enum(WaitlistStatus, name="waitlist_status", native_enum=True),
        nullable=False,
        default=WaitlistStatus.waiting,
        server_default=WaitlistStatus.waiting.value,
    )

    business: Mapped["Business"] = relationship()
    service: Mapped["Service"] = relationship()
