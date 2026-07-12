import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin


class ServiceSlotCapacityOverride(Base, TimestampMixin):
    __tablename__ = "service_slot_capacity_overrides"
    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "service_id",
            "starts_at",
            name="uq_service_slot_capacity_overrides_business_service_starts_at",
        ),
        Index("ix_service_slot_capacity_overrides_business_id", "business_id"),
        Index("ix_service_slot_capacity_overrides_service_id", "service_id"),
        Index("ix_service_slot_capacity_overrides_starts_at", "starts_at"),
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
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    business: Mapped["Business"] = relationship()
    service: Mapped["Service"] = relationship()
