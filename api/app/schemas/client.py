import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import BookingStatus, ClientSource, OrderStatus


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


class ClientListItem(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str | None
    phone: str | None
    source: ClientSource
    bookings_count: int
    orders_count: int
    last_activity_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ClientListMeta(BaseModel):
    page: int
    limit: int
    total: int


class ClientListResponse(BaseModel):
    data: list[ClientListItem]
    meta: ClientListMeta


class ClientBookingSummary(BaseModel):
    id: uuid.UUID
    reference: str
    status: BookingStatus
    service_name: str
    starts_at: datetime
    ends_at: datetime


class ClientOrderSummary(BaseModel):
    id: uuid.UUID
    reference: str
    status: OrderStatus
    service_name: str
    created_at: datetime
    updated_at: datetime


class ClientDetail(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    user_id: uuid.UUID | None
    full_name: str
    email: str | None
    phone: str | None
    notes: str | None
    source: ClientSource
    bookings_count: int
    orders_count: int
    last_activity_at: datetime | None
    bookings: list[ClientBookingSummary]
    orders: list[ClientOrderSummary]
    created_at: datetime
    updated_at: datetime


MAX_CLIENT_NOTES_LENGTH = 5000


class ClientUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.strip():
            raise ValueError("full_name must not be empty")
        return value.strip()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped.lower() if stripped else None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None

    @field_validator("notes")
    @classmethod
    def notes_max_length(cls, value: str | None) -> str | None:
        if value is not None and len(value) > MAX_CLIENT_NOTES_LENGTH:
            raise ValueError(
                f"notes must not exceed {MAX_CLIENT_NOTES_LENGTH} characters"
            )
        return value
