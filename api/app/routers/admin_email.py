from __future__ import annotations

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.config import get_settings
from app.dependencies.auth import get_current_user
from app.exceptions.business import ForbiddenError, ValidationAppError
from app.models.enums import UserRole
from app.models.user import User
from app.services.email_service import (
    EMAIL_CONFIG_INVALID,
    EMAIL_DISABLED,
    EMAIL_DRY_RUN,
    EMAIL_SEND_FAILED,
    EMAIL_SENT,
    EmailMessage,
    EmailService,
)

router = APIRouter(prefix="/admin/email", tags=["admin-email"])

MAX_EMAIL_LENGTH = 254
TEST_EMAIL_SUBJECT = "Service Platform test email"
TEST_EMAIL_BODY = "This is a test email from Service Platform."


def normalize_admin_test_email(value: object) -> str:
    """Validate and normalize a recipient email without DNS/deliverability checks."""
    if not isinstance(value, str):
        raise ValidationAppError("Enter a valid email address.")

    trimmed = value.strip()
    if not trimmed or len(trimmed) > MAX_EMAIL_LENGTH:
        raise ValidationAppError("Enter a valid email address.")

    try:
        result = validate_email(trimmed, check_deliverability=False)
    except EmailNotValidError as exc:
        raise ValidationAppError("Enter a valid email address.") from exc

    return str(result.normalized)


class AdminEmailStatusResponse(BaseModel):
    enabled: bool
    dry_run: bool
    configured: bool
    provider: str
    host: str | None = None
    port: int | None = None
    from_email: str | None = None
    from_name: str | None = None
    status: str


class AdminEmailTestRequest(BaseModel):
    to_email: str = Field(..., min_length=1, max_length=MAX_EMAIL_LENGTH)


class AdminEmailTestResponse(BaseModel):
    ok: bool
    dry_run: bool
    message: str
    message_code: str


def require_business_admin_or_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role in {UserRole.business_admin, UserRole.superadmin}:
        return current_user
    raise ForbiddenError("Business admin access required.")


@router.get("/status", response_model=AdminEmailStatusResponse)
async def get_admin_email_status(
    _admin: User = Depends(require_business_admin_or_superadmin),
) -> AdminEmailStatusResponse:
    status = EmailService(get_settings()).get_delivery_status()
    return AdminEmailStatusResponse(
        enabled=status.enabled,
        dry_run=status.dry_run,
        configured=status.configured,
        provider=status.provider,
        host=status.host,
        port=status.port,
        from_email=status.from_email,
        from_name=status.from_name,
        status=status.status,
    )


@router.post("/test", response_model=AdminEmailTestResponse)
async def send_admin_test_email(
    payload: AdminEmailTestRequest,
    _admin: User = Depends(require_business_admin_or_superadmin),
) -> AdminEmailTestResponse:
    to_email = normalize_admin_test_email(payload.to_email)

    settings = get_settings()
    service = EmailService(settings)

    if settings.email_enabled and not settings.email_dry_run and not settings.smtp_is_configured:
        raise ValidationAppError("Email configuration is incomplete.")

    result = service.send_email(
        EmailMessage(
            to_email=to_email,
            subject=TEST_EMAIL_SUBJECT,
            text_body=TEST_EMAIL_BODY,
        )
    )

    if result.message_code == EMAIL_DISABLED or (
        result.dry_run and result.message_code in {EMAIL_DISABLED, EMAIL_DRY_RUN}
    ):
        return AdminEmailTestResponse(
            ok=True,
            dry_run=True,
            message="Email is in dry-run mode. No email was sent.",
            message_code=result.message_code,
        )

    if result.message_code == EMAIL_CONFIG_INVALID:
        raise ValidationAppError("Email configuration is incomplete.")

    if result.message_code == EMAIL_SEND_FAILED or not result.sent:
        raise ValidationAppError("Failed to send test email. Check server logs for details.")

    if result.message_code == EMAIL_SENT:
        return AdminEmailTestResponse(
            ok=True,
            dry_run=False,
            message="Test email sent.",
            message_code=EMAIL_SENT,
        )

    return AdminEmailTestResponse(
        ok=True,
        dry_run=result.dry_run,
        message="Email is in dry-run mode. No email was sent.",
        message_code=result.message_code,
    )
