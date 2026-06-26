import uuid

from sqlalchemy import Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ClientSource
from app.models.mixins import TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"
    __table_args__ = (
        Index("ix_clients_business_id", "business_id"),
        Index("ix_clients_business_id_email", "business_id", "email"),
        Index("ix_clients_business_id_phone", "business_id", "phone"),
        # TODO: add partial unique index on (business_id, email) WHERE email IS NOT NULL.
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
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[ClientSource] = mapped_column(
        Enum(ClientSource, name="client_source", native_enum=True),
        nullable=False,
        default=ClientSource.guest,
        server_default=ClientSource.guest.value,
    )

    business: Mapped["Business"] = relationship(back_populates="clients")
    user: Mapped["User | None"] = relationship(back_populates="clients")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="client")
