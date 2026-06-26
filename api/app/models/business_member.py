import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import BusinessMemberRole
from app.models.mixins import TimestampMixin


class BusinessMember(Base, TimestampMixin):
    __tablename__ = "business_members"
    __table_args__ = (
        UniqueConstraint("business_id", "user_id", name="uq_business_members_business_user"),
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
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[BusinessMemberRole] = mapped_column(
        Enum(BusinessMemberRole, name="business_member_role", native_enum=True),
        nullable=False,
        default=BusinessMemberRole.owner,
        server_default=BusinessMemberRole.owner.value,
    )
    invited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    joined_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    business: Mapped["Business"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="business_members")
