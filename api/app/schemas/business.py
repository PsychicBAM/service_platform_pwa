import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import BusinessStatus, OperatingMode, PublicPageVariant, SubscriptionPlan, SubscriptionStatus
from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS


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


ALLOWED_SLOT_INTERVALS = {5, 10, 15, 20, 30, 45, 60}


class BusinessSettingsRead(BaseModel):
    auto_confirm_bookings: bool
    cancellation_hours: int
    max_advance_booking_days: int
    min_advance_booking_hours: int
    allow_guest_checkout: bool
    slot_interval_minutes: int
    booking_buffer_minutes: int
    require_payment_default: bool
    notification_email_enabled: bool

    @classmethod
    def from_settings(cls, settings: dict[str, Any] | None) -> "BusinessSettingsRead":
        merged = {**DEFAULT_BUSINESS_SETTINGS, **(settings or {})}
        return cls(
            auto_confirm_bookings=bool(merged["auto_confirm_bookings"]),
            cancellation_hours=int(merged["cancellation_hours"]),
            max_advance_booking_days=int(merged["max_advance_booking_days"]),
            min_advance_booking_hours=int(merged["min_advance_booking_hours"]),
            allow_guest_checkout=bool(merged["allow_guest_checkout"]),
            slot_interval_minutes=int(merged["slot_interval_minutes"]),
            booking_buffer_minutes=int(merged["booking_buffer_minutes"]),
            require_payment_default=bool(merged["require_payment_default"]),
            notification_email_enabled=bool(merged["notification_email_enabled"]),
        )


class BusinessSettingsUpdate(BaseModel):
    auto_confirm_bookings: bool | None = None
    cancellation_hours: int | None = None
    max_advance_booking_days: int | None = None
    min_advance_booking_hours: int | None = None
    allow_guest_checkout: bool | None = None
    slot_interval_minutes: int | None = None
    booking_buffer_minutes: int | None = None
    require_payment_default: bool | None = None
    notification_email_enabled: bool | None = None

    @field_validator("cancellation_hours")
    @classmethod
    def validate_cancellation_hours(cls, value: int | None) -> int | None:
        if value is not None and not 0 <= value <= 720:
            raise ValueError("cancellation_hours must be between 0 and 720")
        return value

    @field_validator("max_advance_booking_days")
    @classmethod
    def validate_max_advance_booking_days(cls, value: int | None) -> int | None:
        if value is not None and not 1 <= value <= 365:
            raise ValueError("max_advance_booking_days must be between 1 and 365")
        return value

    @field_validator("min_advance_booking_hours")
    @classmethod
    def validate_min_advance_booking_hours(cls, value: int | None) -> int | None:
        if value is not None and not 0 <= value <= 720:
            raise ValueError("min_advance_booking_hours must be between 0 and 720")
        return value

    @field_validator("slot_interval_minutes")
    @classmethod
    def validate_slot_interval_minutes(cls, value: int | None) -> int | None:
        if value is not None and value not in ALLOWED_SLOT_INTERVALS:
            raise ValueError(
                "slot_interval_minutes must be one of 5, 10, 15, 20, 30, 45, 60"
            )
        return value

    @field_validator("booking_buffer_minutes")
    @classmethod
    def validate_booking_buffer_minutes(cls, value: int | None) -> int | None:
        if value is not None and not 0 <= value <= 240:
            raise ValueError("booking_buffer_minutes must be between 0 and 240")
        return value


class BusinessSubscriptionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan: SubscriptionPlan
    status: SubscriptionStatus
    usage_bookings_count: int
    usage_orders_count: int


class BusinessAdminRead(BaseModel):
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
    settings: BusinessSettingsRead
    subscription: BusinessSubscriptionSummary | None
    created_at: datetime
    updated_at: datetime


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    logo_url: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    address: str | None = None
    timezone: str | None = None
    operating_mode: OperatingMode | None = None
    settings: BusinessSettingsUpdate | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("name must not be empty")
        return value.strip() if value is not None else None


class PublicBusinessRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    operating_mode: OperatingMode
    contact_phone: str | None
    address: str | None
    public_page_variant: PublicPageVariant
