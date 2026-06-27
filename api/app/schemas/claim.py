from pydantic import BaseModel, field_validator, model_validator

from app.schemas.booking import MyBookingDetail
from app.schemas.order import MyOrderDetail


class ClaimGuestBookingRequest(BaseModel):
    reference: str
    email: str | None = None
    phone: str | None = None

    @field_validator("reference")
    @classmethod
    def normalize_reference(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("reference must not be empty")
        return text

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
    def require_email_or_phone(self) -> "ClaimGuestBookingRequest":
        if not self.email and not self.phone:
            raise ValueError("At least one of email or phone is required")
        return self


class ClaimGuestOrderRequest(BaseModel):
    reference: str
    email: str | None = None
    phone: str | None = None

    @field_validator("reference")
    @classmethod
    def normalize_reference(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("reference must not be empty")
        return text

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
    def require_email_or_phone(self) -> "ClaimGuestOrderRequest":
        if not self.email and not self.phone:
            raise ValueError("At least one of email or phone is required")
        return self


class ClaimGuestBookingResponse(BaseModel):
    booking: MyBookingDetail


class ClaimGuestOrderResponse(BaseModel):
    order: MyOrderDetail
