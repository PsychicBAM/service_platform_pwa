import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import OrderMessageSenderType, OrderStatus


class OrderRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    service_id: uuid.UUID
    client_id: uuid.UUID
    reference: str
    status: OrderStatus
    form_data: dict[str, Any]
    quoted_price_cents: int | None
    admin_notes: str | None
    decline_reason: str | None
    accepted_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderMessageRead(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    business_id: uuid.UUID
    sender_type: OrderMessageSenderType
    sender_user_id: uuid.UUID | None
    body: str
    read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
