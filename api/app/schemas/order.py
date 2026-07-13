import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import OrderMessageSenderType, OrderStatus, PriceType, ServiceType
from app.schemas.legal_consent import LegalConsentRequiredMixin

MAX_FORM_DATA_KEYS = 20
MAX_FORM_DATA_TEXT_LENGTH = 2000
MAX_ORDER_MESSAGE_BODY_LENGTH = 5000
ORDER_MESSAGE_PREVIEW_LENGTH = 120


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


class OrderMessageCreate(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def validate_body(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("body must not be empty")
        if len(text) > MAX_ORDER_MESSAGE_BODY_LENGTH:
            raise ValueError(
                f"body must not exceed {MAX_ORDER_MESSAGE_BODY_LENGTH} characters"
            )
        return text


class OrderMessageListMeta(BaseModel):
    page: int
    limit: int
    total: int


class OrderMessageListResponse(BaseModel):
    data: list[OrderMessageRead]
    meta: OrderMessageListMeta


class PublicOrderClientInput(BaseModel):
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

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None

    @model_validator(mode="after")
    def require_email_or_phone(self) -> "PublicOrderClientInput":
        if not self.email and not self.phone:
            raise ValueError("At least one of email or phone is required")
        return self


def _sanitize_form_data_value(value: Any) -> Any:
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        text = value.strip()
        if len(text) > MAX_FORM_DATA_TEXT_LENGTH:
            raise ValueError(
                f"form_data text values must not exceed {MAX_FORM_DATA_TEXT_LENGTH} characters"
            )
        return text
    raise ValueError("form_data values must be text, number, boolean, or null")


class PublicOrderCreate(LegalConsentRequiredMixin, BaseModel):
    service_id: uuid.UUID
    form_data: dict[str, Any] = Field(default_factory=dict)
    client: PublicOrderClientInput

    @field_validator("form_data")
    @classmethod
    def validate_form_data(cls, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("form_data must be an object")
        if len(value) > MAX_FORM_DATA_KEYS:
            raise ValueError(f"form_data must not exceed {MAX_FORM_DATA_KEYS} keys")
        return {str(key): _sanitize_form_data_value(val) for key, val in value.items()}


class PublicOrderServiceSummary(BaseModel):
    id: uuid.UUID
    name: str
    type: ServiceType


class PublicOrderClientSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str | None
    phone: str | None


class PublicOrderCreateResponse(BaseModel):
    id: uuid.UUID
    reference: str
    status: OrderStatus
    service: PublicOrderServiceSummary
    client: PublicOrderClientSummary
    form_data: dict[str, Any]
    created_at: datetime
    payment_required: bool = False
    payment: None = None

    @classmethod
    def from_entities(cls, order, service, client) -> "PublicOrderCreateResponse":
        return cls(
            id=order.id,
            reference=order.reference,
            status=order.status,
            service=PublicOrderServiceSummary(
                id=service.id,
                name=service.name,
                type=service.type,
            ),
            client=PublicOrderClientSummary(
                id=client.id,
                full_name=client.full_name,
                email=client.email,
                phone=client.phone,
            ),
            form_data=order.form_data,
            created_at=order.created_at,
            payment_required=False,
            payment=None,
        )


class OrderClientSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str | None
    phone: str | None


class OrderServiceSummary(BaseModel):
    id: uuid.UUID
    name: str
    type: ServiceType
    price_cents: int | None
    price_type: PriceType
    currency: str


class AdminOrderRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    reference: str
    status: OrderStatus
    form_data: dict[str, Any]
    quoted_price_cents: int | None
    admin_notes: str | None
    decline_reason: str | None
    accepted_at: datetime | None
    completed_at: datetime | None
    service: OrderServiceSummary
    client: OrderClientSummary
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_order(cls, order) -> "AdminOrderRead":
        return cls(
            id=order.id,
            business_id=order.business_id,
            reference=order.reference,
            status=order.status,
            form_data=order.form_data,
            quoted_price_cents=order.quoted_price_cents,
            admin_notes=order.admin_notes,
            decline_reason=order.decline_reason,
            accepted_at=order.accepted_at,
            completed_at=order.completed_at,
            service=OrderServiceSummary(
                id=order.service.id,
                name=order.service.name,
                type=order.service.type,
                price_cents=order.service.price_cents,
                price_type=order.service.price_type,
                currency=order.service.currency,
            ),
            client=OrderClientSummary(
                id=order.client.id,
                full_name=order.client.full_name,
                email=order.client.email,
                phone=order.client.phone,
            ),
            created_at=order.created_at,
            updated_at=order.updated_at,
        )


class AdminOrderListItem(BaseModel):
    id: uuid.UUID
    reference: str
    status: OrderStatus
    service_name: str
    client_name: str
    client_email: str | None
    client_phone: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_order(cls, order) -> "AdminOrderListItem":
        return cls(
            id=order.id,
            reference=order.reference,
            status=order.status,
            service_name=order.service.name,
            client_name=order.client.full_name,
            client_email=order.client.email,
            client_phone=order.client.phone,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )


class AdminOrderListMeta(BaseModel):
    page: int
    limit: int
    total: int


class AdminOrderListResponse(BaseModel):
    data: list[AdminOrderListItem]
    meta: AdminOrderListMeta


class AdminOrderUpdate(BaseModel):
    admin_notes: str | None = None
    quoted_price_cents: int | None = None

    @field_validator("quoted_price_cents")
    @classmethod
    def quoted_price_non_negative(cls, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise ValueError("quoted_price_cents cannot be negative")
        return value


class AdminOrderAcceptRequest(BaseModel):
    quoted_price_cents: int | None = None
    admin_notes: str | None = None
    start_work: bool = False

    @field_validator("quoted_price_cents")
    @classmethod
    def quoted_price_non_negative(cls, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise ValueError("quoted_price_cents cannot be negative")
        return value


class AdminOrderDeclineRequest(BaseModel):
    decline_reason: str
    admin_notes: str | None = None

    @field_validator("decline_reason")
    @classmethod
    def decline_reason_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("decline_reason must not be empty")
        return value.strip()


class AdminOrderCancelRequest(BaseModel):
    reason: str | None = None


class MyOrderServiceSummary(BaseModel):
    id: uuid.UUID
    name: str
    type: ServiceType
    price_cents: int | None
    price_type: PriceType
    currency: str


class MyOrderBusinessSummary(BaseModel):
    id: uuid.UUID
    name: str
    slug: str


class MyOrderListItem(BaseModel):
    id: uuid.UUID
    reference: str
    status: OrderStatus
    business: MyOrderBusinessSummary
    service: MyOrderServiceSummary
    created_at: datetime
    updated_at: datetime
    last_message_preview: str | None = None
    can_cancel: bool
    has_review: bool = False
    can_review: bool = False


class MyOrderDetail(BaseModel):
    id: uuid.UUID
    reference: str
    status: OrderStatus
    business: MyOrderBusinessSummary
    service: MyOrderServiceSummary
    form_data: dict[str, Any]
    quoted_price_cents: int | None
    decline_reason: str | None
    created_at: datetime
    updated_at: datetime
    accepted_at: datetime | None
    completed_at: datetime | None
    can_cancel: bool
    has_review: bool = False
    can_review: bool = False


class MyOrderListMeta(BaseModel):
    page: int
    limit: int
    total: int


class MyOrderListResponse(BaseModel):
    data: list[MyOrderListItem]
    meta: MyOrderListMeta


class ClientOrderCancelRequest(BaseModel):
    reason: str | None = None
