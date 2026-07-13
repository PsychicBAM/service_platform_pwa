import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.booking_waitlist_entry import BookingWaitlistEntry
from app.models.enums import WaitlistStatus
from app.schemas.booking import AdminBookingRead


class PublicWaitlistCreate(BaseModel):
    service_id: uuid.UUID
    starts_at: datetime
    customer_name: str
    customer_email: str | None = None
    customer_phone: str | None = None
    note: str | None = None

    @field_validator("customer_name")
    @classmethod
    def name_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("customer_name must not be empty")
        return value.strip()

    @field_validator("customer_email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed.lower() if trimmed else None

    @field_validator("customer_phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed if trimmed else None

    @model_validator(mode="after")
    def require_email_or_phone(self) -> "PublicWaitlistCreate":
        if not self.customer_email and not self.customer_phone:
            raise ValueError("At least one of customer_email or customer_phone is required")
        return self


class PublicWaitlistCreateResponse(BaseModel):
    id: uuid.UUID
    service_id: uuid.UUID
    starts_at: datetime
    status: WaitlistStatus
    message: str = "You have joined the waitlist for this time slot."

    @classmethod
    def from_entry(cls, entry: BookingWaitlistEntry) -> "PublicWaitlistCreateResponse":
        return cls(
            id=entry.id,
            service_id=entry.service_id,
            starts_at=entry.starts_at,
            status=entry.status,
        )


class WaitlistEntryRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    service_id: uuid.UUID
    service_name: str
    starts_at: datetime
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    note: str | None
    status: WaitlistStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_entry(cls, entry: BookingWaitlistEntry) -> "WaitlistEntryRead":
        service_name = entry.service.name if entry.service is not None else ""
        return cls(
            id=entry.id,
            business_id=entry.business_id,
            service_id=entry.service_id,
            service_name=service_name,
            starts_at=entry.starts_at,
            customer_name=entry.customer_name,
            customer_email=entry.customer_email,
            customer_phone=entry.customer_phone,
            note=entry.note,
            status=entry.status,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
        )


class WaitlistListResponse(BaseModel):
    data: list[WaitlistEntryRead]


class WaitlistStatusUpdate(BaseModel):
    status: WaitlistStatus

    @field_validator("status")
    @classmethod
    def allowed_status(cls, value: WaitlistStatus) -> WaitlistStatus:
        if value not in {
            WaitlistStatus.waiting,
            WaitlistStatus.contacted,
            WaitlistStatus.cancelled,
            WaitlistStatus.resolved,
        }:
            raise ValueError("Invalid waitlist status")
        return value


class WaitlistPromoteResponse(BaseModel):
    booking: AdminBookingRead
    waitlist_entry: WaitlistEntryRead
