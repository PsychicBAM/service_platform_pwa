import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.exceptions.auth import (
    EmailAlreadyExistsError,
    EmailVerificationRequiredError,
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
    SlugAlreadyExistsError,
)
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    LoginRequest,
    MeBusinessItem,
    MeResponse,
    RefreshResponse,
    RegisterBusinessRequest,
    RegisterBusinessResponse,
    TokenPair,
)
from app.schemas.business import BusinessRead
from app.schemas.user import UserRead
from app.services.password_service import hash_password, verify_password
from app.services.email_verification_service import EmailVerificationService
from app.services.token_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_subject,
    get_token_type,
)


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.businesses = BusinessRepository(session)

    def _build_token_pair(self, user: User) -> TokenPair:
        settings = get_settings()
        return TokenPair(
            access_token=create_access_token(user.id, user.role.value),
            refresh_token=create_refresh_token(user.id),
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def register_business_owner(
        self,
        data: RegisterBusinessRequest,
    ) -> RegisterBusinessResponse:
        if await self.users.get_by_email(data.email):
            raise EmailAlreadyExistsError()
        if await self.businesses.get_by_slug(data.business.slug):
            raise SlugAlreadyExistsError()

        user = await self.users.create(
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            phone=data.phone,
            role=UserRole.business_admin,
        )
        business = await self.businesses.create_business(
            name=data.business.name,
            slug=data.business.slug,
            operating_mode=data.business.operating_mode,
            timezone=data.business.timezone,
            contact_email=data.email,
        )
        await self.businesses.create_member(
            business_id=business.id,
            user_id=user.id,
        )
        await self.businesses.create_subscription(business_id=business.id)

        verification_service = EmailVerificationService(self.session)
        raw_token = await verification_service.create_email_verification_token(user)
        await verification_service.send_verification_email_best_effort(user, raw_token)

        await self.session.commit()
        await self.session.refresh(user)
        await self.session.refresh(business)

        return RegisterBusinessResponse(
            user=UserRead.model_validate(user),
            business=BusinessRead.model_validate(business),
            tokens=self._build_token_pair(user),
        )

    async def login(self, data: LoginRequest) -> tuple[UserRead, TokenPair]:
        user = await self.users.get_by_email(data.email)
        if user is None or not verify_password(data.password, user.password_hash or ""):
            raise InvalidCredentialsError()
        if not user.is_active:
            raise InactiveUserError()

        settings = get_settings()
        if settings.require_email_verification_for_login and user.email_verified_at is None:
            raise EmailVerificationRequiredError()

        await self.users.update_last_login(user)
        await self.session.commit()
        await self.session.refresh(user)

        return UserRead.model_validate(user), self._build_token_pair(user)

    async def refresh_access_token(self, refresh_token: str) -> RefreshResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise InvalidTokenError()

        user_id = get_token_subject(refresh_token)
        if get_token_type(refresh_token) != "refresh":
            raise InvalidTokenError()

        user = await self.users.get_by_id(user_id)
        if user is None:
            raise InvalidTokenError()
        if not user.is_active:
            raise InactiveUserError()

        settings = get_settings()
        return RefreshResponse(
            access_token=create_access_token(user.id, user.role.value),
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def get_me(self, user_id: uuid.UUID) -> MeResponse:
        user = await self.users.get_by_id_with_businesses(user_id)
        if user is None:
            raise InvalidTokenError()
        if not user.is_active:
            raise InactiveUserError()

        businesses = [
            MeBusinessItem(
                id=member.business.id,
                name=member.business.name,
                slug=member.business.slug,
                role=member.role.value,
            )
            for member in user.business_members
        ]

        return MeResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            email_verified=user.email_verified_at is not None,
            businesses=businesses,
        )
