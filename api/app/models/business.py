import uuid
from typing import Any

from sqlalchemy import Enum, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import BusinessStatus, OperatingMode
from app.models.mixins import TimestampMixin


class Business(Base, TimestampMixin):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="UTC",
        server_default="UTC",
    )
    operating_mode: Mapped[OperatingMode] = mapped_column(
        Enum(OperatingMode, name="operating_mode", native_enum=True),
        nullable=False,
        default=OperatingMode.booking_only,
        server_default=OperatingMode.booking_only.value,
    )
    status: Mapped[BusinessStatus] = mapped_column(
        Enum(BusinessStatus, name="business_status", native_enum=True),
        nullable=False,
        default=BusinessStatus.pending_setup,
        server_default=BusinessStatus.pending_setup.value,
    )
    settings: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    stripe_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    members: Mapped[list["BusinessMember"]] = relationship(
        back_populates="business",
    )
    subscription: Mapped["Subscription | None"] = relationship(
        back_populates="business",
        uselist=False,
    )
    services: Mapped[list["Service"]] = relationship(
        back_populates="business",
    )
    working_hours: Mapped[list["WorkingHour"]] = relationship(
        back_populates="business",
    )
    working_breaks: Mapped[list["WorkingBreak"]] = relationship(
        back_populates="business",
    )
    unavailable_times: Mapped[list["UnavailableTime"]] = relationship(
        back_populates="business",
    )
