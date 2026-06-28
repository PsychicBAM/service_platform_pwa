from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.models.user import User
from app.schemas.auth import (
    EmailVerificationResendResponse,
    EmailVerifyRequest,
    EmailVerifyResponse,
    LoginRequest,
    LoginResponse,
    MeResponse,
    PasswordResetConfirmRequest,
    PasswordResetConfirmResponse,
    PasswordResetRequest,
    PasswordResetRequestResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterBusinessRequest,
    RegisterBusinessResponse,
)
from app.services.auth_service import AuthService
from app.services.email_verification_service import EmailVerificationService
from app.services.password_reset_service import PasswordResetService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


def get_email_verification_service(
    db: AsyncSession = Depends(get_db),
) -> EmailVerificationService:
    return EmailVerificationService(db)


def get_password_reset_service(
    db: AsyncSession = Depends(get_db),
) -> PasswordResetService:
    return PasswordResetService(db)


@router.post("/register", response_model=RegisterBusinessResponse, status_code=201)
async def register_business_owner(
    payload: RegisterBusinessRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> RegisterBusinessResponse:
    return await auth_service.register_business_owner(payload)


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    user, tokens = await auth_service.login(payload)
    return LoginResponse(user=user, tokens=tokens)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    payload: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> RefreshResponse:
    return await auth_service.refresh_access_token(payload.refresh_token)


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(require_active_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> MeResponse:
    return await auth_service.get_me(current_user.id)


@router.post("/verify-email", response_model=EmailVerifyResponse)
async def verify_email(
    payload: EmailVerifyRequest,
    verification_service: EmailVerificationService = Depends(get_email_verification_service),
) -> EmailVerifyResponse:
    user = await verification_service.verify_email_token(payload.token)
    return EmailVerifyResponse(verified=True, email=user.email)


@router.post("/resend-verification", response_model=EmailVerificationResendResponse)
async def resend_verification(
    current_user: User = Depends(require_active_user),
    verification_service: EmailVerificationService = Depends(get_email_verification_service),
) -> EmailVerificationResendResponse:
    result = await verification_service.resend_email_verification(current_user)
    return EmailVerificationResendResponse(
        sent=result.sent,
        already_verified=result.already_verified,
        message=result.message,
    )


@router.post("/request-password-reset", response_model=PasswordResetRequestResponse)
async def request_password_reset(
    payload: PasswordResetRequest,
    reset_service: PasswordResetService = Depends(get_password_reset_service),
) -> PasswordResetRequestResponse:
    result = await reset_service.request_password_reset(payload.email)
    return PasswordResetRequestResponse(sent=result.sent)


@router.post("/reset-password", response_model=PasswordResetConfirmResponse)
async def reset_password(
    payload: PasswordResetConfirmRequest,
    reset_service: PasswordResetService = Depends(get_password_reset_service),
) -> PasswordResetConfirmResponse:
    await reset_service.reset_password(payload.token, payload.new_password)
    return PasswordResetConfirmResponse(reset=True)
