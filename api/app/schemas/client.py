import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ClientSource


class ClientRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    user_id: uuid.UUID | None
    full_name: str
    email: str | None
    phone: str | None
    source: ClientSource
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
