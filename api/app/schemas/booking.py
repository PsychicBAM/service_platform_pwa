import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.enums import BookingStatus, ServiceType


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


class PublicBookingClientInput(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, value: str) -> str:
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

    @model_validator(mode="after")
    def require_email_or_phone(self) -> "PublicBookingClientInput":
        if not self.email and not self.phone:
            raise ValueError("At least one of email or phone is required")
        return self


class PublicBookingCreate(BaseModel):
    service_id: uuid.UUID
    starts_at: datetime
    client_notes: str | None = None
    client: PublicBookingClientInput


class PublicBookingServiceSummary(BaseModel):
    id: uuid.UUID
    name: str
    type: ServiceType


class PublicBookingClientSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str | None
    phone: str | None


class PublicBookingCreateResponse(BaseModel):
    id: uuid.UUID
    reference: str
    status: BookingStatus
    service: PublicBookingServiceSummary
    client: PublicBookingClientSummary
    starts_at: datetime
    ends_at: datetime
    payment_required: bool = False
    payment: None = None

    @classmethod
    def from_entities(cls, booking, service, client) -> "PublicBookingCreateResponse":
        return cls(
            id=booking.id,
            reference=booking.reference,
            status=booking.status,
            service=PublicBookingServiceSummary(
                id=service.id,
                name=service.name,
                type=service.type,
            ),
            client=PublicBookingClientSummary(
                id=client.id,
                full_name=client.full_name,
                email=client.email,
                phone=client.phone,
            ),
            starts_at=booking.starts_at,
            ends_at=booking.ends_at,
            payment_required=False,
            payment=None,
        )
