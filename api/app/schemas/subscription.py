import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import SubscriptionPlan, SubscriptionStatus


class SubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: uuid.UUID
    plan: SubscriptionPlan
    status: SubscriptionStatus
    stripe_subscription_id: str | None
    stripe_customer_id: str | None
    current_period_start: datetime | None
    current_period_end: datetime | None
    usage_bookings_count: int
    usage_orders_count: int
    created_at: datetime
    updated_at: datetime
