import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import (
    PlanChangeDirection,
    PlanChangeRequestStatus,
    SubscriptionPlan,
)
from app.models.mixins import TimestampMixin


class PlanChangeRequest(Base, TimestampMixin):
    __tablename__ = "plan_change_requests"
    __table_args__ = (
        Index("ix_plan_change_requests_business_id", "business_id"),
        Index("ix_plan_change_requests_status", "status"),
        Index("ix_plan_change_requests_business_id_status", "business_id", "status"),
        Index("ix_plan_change_requests_created_at", "created_at"),
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
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    current_plan: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan, name="subscription_plan", native_enum=True, create_type=False),
        nullable=False,
    )
    requested_plan: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan, name="subscription_plan", native_enum=True, create_type=False),
        nullable=False,
    )
    direction: Mapped[PlanChangeDirection] = mapped_column(
        Enum(PlanChangeDirection, name="plan_change_direction", native_enum=True),
        nullable=False,
    )
    status: Mapped[PlanChangeRequestStatus] = mapped_column(
        Enum(PlanChangeRequestStatus, name="plan_change_request_status", native_enum=True),
        nullable=False,
        default=PlanChangeRequestStatus.pending,
        server_default=PlanChangeRequestStatus.pending.value,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    business: Mapped["Business"] = relationship()
