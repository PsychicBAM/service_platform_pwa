import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None
    phone: str | None
    role: UserRole
    email_verified_at: datetime | None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
