from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import ReviewStatus


MAX_REVIEW_COMMENT_LENGTH = 2000


class ReviewRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    service_id: uuid.UUID | None
    service_name: str | None = None
    booking_id: uuid.UUID | None
    booking_reference: str | None = None
    order_id: uuid.UUID | None
    order_reference: str | None = None
    customer_name: str
    rating: int
    comment: str | None
    status: ReviewStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminReviewStatusUpdate(BaseModel):
    status: ReviewStatus


class PublicReviewCreate(BaseModel):
    booking_reference: str | None = None
    order_reference: str | None = None
    email: str | None = None
    phone: str | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=MAX_REVIEW_COMMENT_LENGTH)
    customer_name: str | None = Field(default=None, max_length=255)

    @field_validator("booking_reference", "order_reference")
    @classmethod
    def normalize_reference(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed if trimmed else None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed.lower() if trimmed else None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed if trimmed else None

    @field_validator("customer_name")
    @classmethod
    def normalize_customer_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed if trimmed else None

    @model_validator(mode="after")
    def validate_target_and_contact(self) -> "PublicReviewCreate":
        has_booking = bool(self.booking_reference)
        has_order = bool(self.order_reference)
        if has_booking == has_order:
            raise ValueError("Provide either booking_reference or order_reference.")
        if not self.email and not self.phone:
            raise ValueError("At least one of email or phone is required.")
        return self


class PublicReviewItem(BaseModel):
    id: uuid.UUID
    customer_name: str
    rating: int
    comment: str | None
    service_name: str | None = None
    created_at: datetime


class PublicReviewSummary(BaseModel):
    average_rating: float | None = None
    review_count: int = 0


class PublicReviewsResponse(BaseModel):
    summary: PublicReviewSummary
    reviews: list[PublicReviewItem]

