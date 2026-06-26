import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import BookingStatus


class BookingRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    service_id: uuid.UUID
    client_id: uuid.UUID
    reference: str
    starts_at: datetime
    ends_at: datetime
    status: BookingStatus
    client_notes: str | None
    admin_notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
