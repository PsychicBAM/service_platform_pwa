import uuid
from typing import Any

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import PriceType, ServiceType
from app.models.mixins import TimestampMixin


class Service(Base, TimestampMixin):
    __tablename__ = "services"
    __table_args__ = (
        Index("ix_services_business_id", "business_id"),
        Index("ix_services_business_id_type", "business_id", "type"),
        Index("ix_services_business_id_is_active", "business_id", "is_active"),
        Index("ix_services_business_id_sort_order", "business_id", "sort_order"),
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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type", native_enum=True),
        nullable=False,
    )
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
        server_default="USD",
    )
    price_type: Mapped[PriceType] = mapped_column(
        Enum(PriceType, name="price_type", native_enum=True),
        nullable=False,
        default=PriceType.fixed,
        server_default=PriceType.fixed.value,
    )
    require_payment: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    image_: Mapped[dict[str, Any] | None] = mapped_column(
        "image",
        JSONB,
        nullable=True,
    )

    business: Mapped["Business"] = relationship(back_populates="services")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="service")
    orders: Mapped[list["Order"]] = relationship(back_populates="service")
