import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import PriceType, ServiceType
from app.models.service import Service
from app.schemas.service_image import ServiceImageMedia
from app.utils.service_image import read_service_image


class ServiceRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    description: str | None
    type: ServiceType
    duration_minutes: int | None
    price_cents: int | None
    currency: str
    price_type: PriceType
    require_payment: bool
    is_active: bool
    sort_order: int
    capacity: int = 1
    metadata: dict[str, Any]
    image: ServiceImageMedia | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_service(cls, service: Service) -> "ServiceRead":
        price_cents = service.price_cents
        if service.price_type == PriceType.free and price_cents is None:
            price_cents = 0
        return cls(
            id=service.id,
            business_id=service.business_id,
            name=service.name,
            description=service.description,
            type=service.type,
            duration_minutes=service.duration_minutes,
            price_cents=price_cents,
            currency=service.currency,
            price_type=service.price_type,
            require_payment=service.require_payment,
            is_active=service.is_active,
            sort_order=service.sort_order,
            capacity=service.capacity,
            metadata=service.metadata_,
            image=read_service_image(service.image_),
            created_at=service.created_at,
            updated_at=service.updated_at,
        )


class PublicServiceRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    type: ServiceType
    duration_minutes: int | None = None
    price_cents: int | None
    currency: str
    price_type: PriceType
    require_payment: bool
    sort_order: int
    capacity: int | None = None
    image: ServiceImageMedia | None = None

    @classmethod
    def from_service(cls, service: Service) -> "PublicServiceRead":
        price_cents = service.price_cents
        if service.price_type == PriceType.free and price_cents is None:
            price_cents = 0
        duration = (
            service.duration_minutes
            if service.type == ServiceType.booking
            else None
        )
        capacity = service.capacity if service.type == ServiceType.booking else None
        return cls(
            id=service.id,
            name=service.name,
            description=service.description,
            type=service.type,
            duration_minutes=duration,
            price_cents=price_cents,
            currency=service.currency,
            price_type=service.price_type,
            require_payment=service.require_payment,
            sort_order=service.sort_order,
            capacity=capacity,
            image=read_service_image(service.image_),
        )


class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    type: ServiceType
    duration_minutes: int | None = None
    price_cents: int | None = None
    currency: str = "USD"
    price_type: PriceType = PriceType.fixed
    require_payment: bool = False
    is_active: bool = True
    sort_order: int = 0
    capacity: int = 1
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("capacity")
    @classmethod
    def capacity_minimum(cls, value: int) -> int:
        if value < 1:
            raise ValueError("capacity must be at least 1")
        return value

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name must not be empty")
        return value.strip()

    @field_validator("currency")
    @classmethod
    def currency_length(cls, value: str) -> str:
        if len(value) != 3:
            raise ValueError("currency must be exactly 3 characters")
        return value.upper()

    @field_validator("price_cents")
    @classmethod
    def price_cents_non_negative(cls, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise ValueError("price_cents cannot be negative")
        return value

    @field_validator("duration_minutes")
    @classmethod
    def duration_range(cls, value: int | None) -> int | None:
        if value is not None and not (15 <= value <= 480):
            raise ValueError("duration_minutes must be between 15 and 480")
        return value

    @model_validator(mode="after")
    def validate_booking_duration(self) -> "ServiceCreate":
        if self.type == ServiceType.booking and self.duration_minutes is None:
            raise ValueError("duration_minutes is required for booking services")
        if self.type == ServiceType.order:
            self.capacity = 1
        return self

    @model_validator(mode="after")
    def validate_price_type(self) -> "ServiceCreate":
        if self.price_type == PriceType.fixed and self.price_cents is None:
            raise ValueError("price_cents is required when price_type is fixed")
        if self.price_type == PriceType.fixed and self.price_cents is not None:
            if self.price_cents < 0:
                raise ValueError("price_cents cannot be negative")
        return self


class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    price_cents: int | None = None
    currency: str | None = None
    price_type: PriceType | None = None
    require_payment: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    capacity: int | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("capacity")
    @classmethod
    def capacity_minimum(cls, value: int | None) -> int | None:
        if value is not None and value < 1:
            raise ValueError("capacity must be at least 1")
        return value

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("name must not be empty")
        return value.strip() if value is not None else None

    @field_validator("currency")
    @classmethod
    def currency_length(cls, value: str | None) -> str | None:
        if value is not None and len(value) != 3:
            raise ValueError("currency must be exactly 3 characters")
        return value.upper() if value is not None else None

    @field_validator("price_cents")
    @classmethod
    def price_cents_non_negative(cls, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise ValueError("price_cents cannot be negative")
        return value

    @field_validator("duration_minutes")
    @classmethod
    def duration_range(cls, value: int | None) -> int | None:
        if value is not None and not (15 <= value <= 480):
            raise ValueError("duration_minutes must be between 15 and 480")
        return value


class ServiceListMeta(BaseModel):
    page: int
    limit: int
    total: int


class ServiceListResponse(BaseModel):
    data: list[ServiceRead]
    meta: ServiceListMeta
