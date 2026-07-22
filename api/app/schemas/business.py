import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import BusinessStatus, OperatingMode, PublicPageVariant, SubscriptionPlan, SubscriptionStatus
from app.repositories.business_repository import (
    ALLOWED_AUTO_REVIEW_REQUEST_DELAY_MINUTES,
    ALLOWED_DURATION_INCREMENTS,
    ALLOWED_DURATION_UNITS,
    ALLOWED_PRICE_DISPLAY_MODES,
    ALLOWED_SERVICE_ADDON_DISPLAY_MODES,
    ALLOWED_SERVICE_ADDON_SELECTION_MODES,
    ALLOWED_SERVICE_CURRENCIES,
    ALLOWED_SERVICE_VISIBILITY_MODES,
    ALLOWED_TAX_MODES,
    DEFAULT_BUSINESS_SETTINGS,
)
from app.schemas.mini_site import MiniSiteConfig
from app.schemas.service_image import ServiceImageMedia
from app.utils.notification_templates import (
    normalize_notification_templates_patch,
    resolve_notification_templates,
)
from app.utils.public_location import PublicLocation, PublicLocationWrite


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


def _resolve_show_tax_note(
    raw: dict[str, Any] | None, merged: dict[str, Any]
) -> bool:
    source = raw or {}
    if "show_tax_note_to_customers" in source:
        return bool(source["show_tax_note_to_customers"])
    # Legacy mapping from older price_display field (before merge defaults).
    if "price_display" in source:
        return str(source["price_display"]) != "hide_tax"
    return bool(merged.get("show_tax_note_to_customers", True))


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
    auto_review_request_enabled: bool
    auto_review_request_delay_minutes: int
    notification_templates: dict[str, Any]
    service_currency: str
    price_display: str
    tax_mode: str
    tax_rate_percent: float
    show_tax_note_to_customers: bool
    service_visibility: str
    show_service_duration: bool
    show_service_description: bool
    show_service_capacity: bool
    show_service_images: bool
    show_service_categories: bool
    require_service_category: bool
    duration_unit: str
    default_duration_minutes: int
    duration_increment_minutes: int
    auto_confirm_within_hours: int
    service_addons_enabled: bool
    service_addon_selection_mode: str
    service_addon_display: str

    @classmethod
    def from_settings(cls, settings: dict[str, Any] | None) -> "BusinessSettingsRead":
        raw = settings or {}
        merged = {**DEFAULT_BUSINESS_SETTINGS, **raw}
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
            auto_review_request_enabled=bool(merged["auto_review_request_enabled"]),
            auto_review_request_delay_minutes=int(
                merged["auto_review_request_delay_minutes"]
            ),
            notification_templates=resolve_notification_templates(merged),
            service_currency=str(merged["service_currency"]).upper(),
            price_display=str(merged["price_display"]),
            tax_mode=str(merged["tax_mode"]),
            tax_rate_percent=float(merged["tax_rate_percent"]),
            show_tax_note_to_customers=_resolve_show_tax_note(raw, merged),
            service_visibility=str(merged["service_visibility"]),
            show_service_duration=bool(merged["show_service_duration"]),
            show_service_description=bool(merged["show_service_description"]),
            show_service_capacity=bool(merged["show_service_capacity"]),
            show_service_images=bool(merged["show_service_images"]),
            show_service_categories=bool(merged["show_service_categories"]),
            require_service_category=bool(merged["require_service_category"]),
            duration_unit=str(merged["duration_unit"]),
            default_duration_minutes=int(merged["default_duration_minutes"]),
            duration_increment_minutes=int(merged["duration_increment_minutes"]),
            auto_confirm_within_hours=int(merged["auto_confirm_within_hours"]),
            service_addons_enabled=bool(merged["service_addons_enabled"]),
            service_addon_selection_mode=str(merged["service_addon_selection_mode"]),
            service_addon_display=str(merged["service_addon_display"]),
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
    auto_review_request_enabled: bool | None = None
    auto_review_request_delay_minutes: int | None = None
    notification_templates: dict[str, Any] | None = None
    service_currency: str | None = None
    price_display: str | None = None
    tax_mode: str | None = None
    tax_rate_percent: float | None = None
    show_tax_note_to_customers: bool | None = None
    service_visibility: str | None = None
    show_service_duration: bool | None = None
    show_service_description: bool | None = None
    show_service_capacity: bool | None = None
    show_service_images: bool | None = None
    show_service_categories: bool | None = None
    require_service_category: bool | None = None
    duration_unit: str | None = None
    default_duration_minutes: int | None = None
    duration_increment_minutes: int | None = None
    auto_confirm_within_hours: int | None = None
    service_addons_enabled: bool | None = None
    service_addon_selection_mode: str | None = None
    service_addon_display: str | None = None

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

    @field_validator("auto_review_request_delay_minutes")
    @classmethod
    def validate_auto_review_request_delay_minutes(cls, value: int | None) -> int | None:
        if value is not None and value not in ALLOWED_AUTO_REVIEW_REQUEST_DELAY_MINUTES:
            raise ValueError(
                "auto_review_request_delay_minutes must be one of "
                "0, 60, 1440, 2880, 10080"
            )
        return value

    @field_validator("notification_templates")
    @classmethod
    def validate_notification_templates(
        cls, value: dict[str, Any] | None
    ) -> dict[str, Any] | None:
        return normalize_notification_templates_patch(value)

    @field_validator("service_currency")
    @classmethod
    def validate_service_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if normalized not in ALLOWED_SERVICE_CURRENCIES:
            raise ValueError(
                "service_currency must be one of "
                + ", ".join(sorted(ALLOWED_SERVICE_CURRENCIES))
            )
        return normalized

    @field_validator("price_display")
    @classmethod
    def validate_price_display(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_PRICE_DISPLAY_MODES:
            raise ValueError(
                "price_display must be one of including_tax, excluding_tax, hide_tax"
            )
        return value

    @field_validator("tax_mode")
    @classmethod
    def validate_tax_mode(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_TAX_MODES:
            raise ValueError("tax_mode must be one of none, inclusive, exclusive")
        return value

    @field_validator("tax_rate_percent")
    @classmethod
    def validate_tax_rate_percent(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if not 0 <= float(value) <= 100:
            raise ValueError("tax_rate_percent must be between 0 and 100")
        return float(value)

    @field_validator("service_visibility")
    @classmethod
    def validate_service_visibility(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_SERVICE_VISIBILITY_MODES:
            raise ValueError("service_visibility must be one of all_visible, active_only")
        return value

    @field_validator("service_addon_selection_mode")
    @classmethod
    def validate_service_addon_selection_mode(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_SERVICE_ADDON_SELECTION_MODES:
            raise ValueError(
                "service_addon_selection_mode must be one of "
                "customer_choice, preselected_none, required"
            )
        return value

    @field_validator("service_addon_display")
    @classmethod
    def validate_service_addon_display(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_SERVICE_ADDON_DISPLAY_MODES:
            raise ValueError(
                "service_addon_display must be one of service_page, checkout, both"
            )
        return value

    @field_validator("duration_unit")
    @classmethod
    def validate_duration_unit(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_DURATION_UNITS:
            raise ValueError("duration_unit must be minutes")
        return value

    @field_validator("default_duration_minutes")
    @classmethod
    def validate_default_duration_minutes(cls, value: int | None) -> int | None:
        if value is not None and not 1 <= value <= 1440:
            raise ValueError("default_duration_minutes must be between 1 and 1440")
        return value

    @field_validator("duration_increment_minutes")
    @classmethod
    def validate_duration_increment_minutes(cls, value: int | None) -> int | None:
        if value is not None and value not in ALLOWED_DURATION_INCREMENTS:
            raise ValueError(
                "duration_increment_minutes must be one of 5, 10, 15, 20, 30, 45, 60"
            )
        return value

    @field_validator("auto_confirm_within_hours")
    @classmethod
    def validate_auto_confirm_within_hours(cls, value: int | None) -> int | None:
        if value is not None and not 0 <= value <= 720:
            raise ValueError("auto_confirm_within_hours must be between 0 and 720")
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
    marketplace_cover_image: ServiceImageMedia | None = None
    public_location: PublicLocation | None = None
    public_page_variant: PublicPageVariant = PublicPageVariant.standard
    subscription: BusinessSubscriptionSummary | None
    created_at: datetime
    updated_at: datetime


class PublicPageVariantUpdate(BaseModel):
    """Owner preference: Default business profile (standard) or mini-site layout."""

    public_page_variant: PublicPageVariant


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
    public_location: PublicLocationWrite | None = None

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
    location: PublicLocation | None = None
    average_rating: float | None = None
    review_count: int = 0
    cover_image_url: str | None = None
    public_page_variant: PublicPageVariant
    mini_site_config: MiniSiteConfig | None = None
    service_currency: str = "USD"
    tax_mode: str = "none"
    tax_rate_percent: float = 0
    show_tax_note_to_customers: bool = True


class PublicBusinessDirectoryServicePreview(BaseModel):
    name: str
    type: str
    price_cents: int | None = None
    currency: str = "USD"
    price_type: str
    duration_minutes: int | None = None
    image_url: str | None = None


class PublicBusinessDirectoryItem(BaseModel):
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    address: str | None
    location: PublicLocation | None = None
    operating_mode: OperatingMode
    average_rating: float | None = None
    review_count: int = 0
    cover_image_url: str | None = None
    has_booking_service: bool = False
    starts_at_price_cents: int | None = None
    starts_at_currency: str | None = None
    services_preview: list[PublicBusinessDirectoryServicePreview] = []


class PublicBusinessDirectoryMeta(BaseModel):
    page: int
    limit: int
    total: int


class PublicBusinessDirectoryResponse(BaseModel):
    data: list[PublicBusinessDirectoryItem]
    meta: PublicBusinessDirectoryMeta
