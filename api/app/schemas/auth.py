import re
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import OperatingMode, SubscriptionPlan, UserRole
from app.schemas.business import BusinessRead
from app.schemas.legal_consent import LegalConsentRequiredMixin
from app.schemas.user import UserRead

SLUG_PATTERN = re.compile(r"^[a-z0-9-]+$")


class BusinessRegisterInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100)
    operating_mode: OperatingMode = OperatingMode.booking_only
    timezone: str = "UTC"

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not SLUG_PATTERN.match(normalized):
            raise ValueError(
                "Slug must contain only lowercase letters, numbers, and hyphens."
            )
        return normalized


class RegisterBusinessRequest(LegalConsentRequiredMixin, BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    business: BusinessRegisterInput
    selected_plan_intent: SubscriptionPlan = SubscriptionPlan.free

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class RegisterClientRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RegisterBusinessResponse(BaseModel):
    user: UserRead
    business: BusinessRead
    tokens: TokenPair


class RegisterClientResponse(BaseModel):
    user: UserRead
    tokens: TokenPair


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginResponse(BaseModel):
    user: UserRead
    tokens: TokenPair


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MeBusinessItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    role: str


class MeResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    role: UserRole
    email_verified: bool = False
    businesses: list[MeBusinessItem]


class EmailVerifyRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)


class EmailVerifyResponse(BaseModel):
    verified: bool = True
    email: str


class EmailVerificationResendResponse(BaseModel):
    sent: bool
    already_verified: bool
    message: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class PasswordResetRequestResponse(BaseModel):
    sent: bool = True


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetConfirmResponse(BaseModel):
    reset: bool = True
