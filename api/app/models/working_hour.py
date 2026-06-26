import uuid
from datetime import time

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    SmallInteger,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin


class WorkingHour(Base, TimestampMixin):
    __tablename__ = "working_hours"
    __table_args__ = (
        UniqueConstraint("business_id", "day_of_week", name="uq_working_hours_business_day"),
        CheckConstraint("day_of_week >= 0 AND day_of_week <= 6", name="ck_working_hours_day"),
        Index("ix_working_hours_business_id", "business_id"),
        Index("ix_working_hours_business_id_day", "business_id", "day_of_week"),
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
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    opens_at: Mapped[time | None] = mapped_column(Time, nullable=True)
    closes_at: Mapped[time | None] = mapped_column(Time, nullable=True)

    business: Mapped["Business"] = relationship(back_populates="working_hours")
