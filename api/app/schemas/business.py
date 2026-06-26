import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import BusinessStatus, OperatingMode


class BusinessRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    contact_email: str | None
    contact_phone: str | None
    address: str | None
    timezone: str
    operating_mode: OperatingMode
    status: BusinessStatus
    settings: dict[str, Any]
    stripe_account_id: str | None
    created_at: datetime
    updated_at: datetime
