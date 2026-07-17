import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_serializer, model_validator

from app.models.enums import BookingStatus, ServiceType
from app.schemas.legal_consent import LegalConsentRequiredMixin


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


class PublicBookingCreate(LegalConsentRequiredMixin, BaseModel):
    service_id: uuid.UUID
    starts_at: datetime
    client_notes: str | None = None
    client: PublicBookingClientInput
    follow_up_email_consent: bool = False


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
    # Present only for authenticated create requests (omitted for guests).
    linked_to_account: bool | None = None

    @model_serializer(mode="wrap")
    def _serialize(self, serializer):
        data = serializer(self)
        if data.get("linked_to_account") is None:
            data.pop("linked_to_account", None)
        return data

    @classmethod
    def from_entities(
        cls,
        booking,
        service,
        client,
        *,
        linked_to_account: bool | None = None,
    ) -> "PublicBookingCreateResponse":
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
            linked_to_account=linked_to_account,
        )


class BookingClientSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str | None
    phone: str | None


class BookingServiceSummary(BaseModel):
    id: uuid.UUID
    name: str
    type: ServiceType
    duration_minutes: int | None


class AdminBookingRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    reference: str
    status: BookingStatus
    starts_at: datetime
    ends_at: datetime
    client_notes: str | None
    admin_notes: str | None
    cancelled_at: datetime | None
    cancelled_by: str | None
    cancellation_reason: str | None
    service: BookingServiceSummary
    client: BookingClientSummary
    created_at: datetime
    updated_at: datetime
    has_review: bool = False
    can_review: bool = False
    follow_up_email_consent: bool = False

    @classmethod
    def from_booking(cls, booking, *, has_review: bool = False) -> "AdminBookingRead":
        can_review = booking.status == BookingStatus.completed and not has_review
        return cls(
            id=booking.id,
            business_id=booking.business_id,
            reference=booking.reference,
            status=booking.status,
            starts_at=booking.starts_at,
            ends_at=booking.ends_at,
            client_notes=booking.client_notes,
            admin_notes=booking.admin_notes,
            cancelled_at=booking.cancelled_at,
            cancelled_by=booking.cancelled_by.value if booking.cancelled_by else None,
            cancellation_reason=booking.cancellation_reason,
            service=BookingServiceSummary(
                id=booking.service.id,
                name=booking.service.name,
                type=booking.service.type,
                duration_minutes=booking.service.duration_minutes,
            ),
            client=BookingClientSummary(
                id=booking.client.id,
                full_name=booking.client.full_name,
                email=booking.client.email,
                phone=booking.client.phone,
            ),
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            has_review=has_review,
            can_review=can_review,
            follow_up_email_consent=bool(booking.follow_up_email_consent),
        )


class AdminBookingListItem(BaseModel):
    id: uuid.UUID
    reference: str
    status: BookingStatus
    starts_at: datetime
    ends_at: datetime
    service_name: str
    client_name: str
    client_email: str | None
    client_phone: str | None
    has_review: bool = False
    can_review: bool = False
    follow_up_email_consent: bool = False

    @classmethod
    def from_booking(cls, booking, *, has_review: bool = False) -> "AdminBookingListItem":
        can_review = booking.status == BookingStatus.completed and not has_review
        return cls(
            id=booking.id,
            reference=booking.reference,
            status=booking.status,
            starts_at=booking.starts_at,
            ends_at=booking.ends_at,
            service_name=booking.service.name,
            client_name=booking.client.full_name,
            client_email=booking.client.email,
            client_phone=booking.client.phone,
            has_review=has_review,
            can_review=can_review,
            follow_up_email_consent=bool(booking.follow_up_email_consent),
        )


class AdminBookingListMeta(BaseModel):
    page: int
    limit: int
    total: int


class AdminBookingListResponse(BaseModel):
    data: list[AdminBookingListItem]
    meta: AdminBookingListMeta


class AdminBookingUpdate(BaseModel):
    status: BookingStatus | None = None
    admin_notes: str | None = None


class AdminBookingCancelRequest(BaseModel):
    reason: str | None = None


class MyBookingBusinessSummary(BaseModel):
    id: uuid.UUID
    name: str
    slug: str


class MyBookingServiceSummary(BaseModel):
    id: uuid.UUID
    name: str


class MyBookingListItem(BaseModel):
    id: uuid.UUID
    reference: str
    status: BookingStatus
    business: MyBookingBusinessSummary
    service: MyBookingServiceSummary
    starts_at: datetime
    ends_at: datetime
    can_cancel: bool
    can_reschedule: bool
    has_review: bool = False
    can_review: bool = False


class MyBookingDetail(BaseModel):
    id: uuid.UUID
    reference: str
    status: BookingStatus
    business: MyBookingBusinessSummary
    service: MyBookingServiceSummary
    starts_at: datetime
    ends_at: datetime
    client_notes: str | None
    cancelled_at: datetime | None
    cancelled_by: str | None
    cancellation_reason: str | None
    can_cancel: bool
    can_reschedule: bool
    has_review: bool = False
    can_review: bool = False
    created_at: datetime
    updated_at: datetime


class ClientBookingCancelRequest(BaseModel):
    reason: str | None = None


class ClientBookingRescheduleRequest(BaseModel):
    starts_at: datetime


class ClientBookingListMeta(BaseModel):
    page: int
    limit: int
    total: int


class ClientBookingListResponse(BaseModel):
    data: list[MyBookingListItem]
    meta: ClientBookingListMeta
