from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.exceptions.auth import EmailVerificationTokenInvalidError
from app.models.user import User
from app.repositories.email_verification_repository import EmailVerificationRepository
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailService
from app.services.email_templates import build_email_verification_email

logger = logging.getLogger(__name__)


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_verification_url(raw_token: str, settings: Settings | None = None) -> str:
    resolved = settings or get_settings()
    base = resolved.email_verification_base_url.rstrip("/")
    return f"{base}?{urlencode({'token': raw_token})}"


@dataclass(frozen=True)
class EmailVerificationResendResult:
    sent: bool
    already_verified: bool
    message: str | None = None


class EmailVerificationService:
    def __init__(
        self,
        session: AsyncSession,
        email_service: EmailService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.tokens = EmailVerificationRepository(session)
        self.users = UserRepository(session)
        self.email_service = email_service or EmailService(settings=self.settings)

    async def create_email_verification_token(self, user: User) -> str:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(
            hours=self.settings.email_verification_token_expire_hours
        )
        await self.tokens.create(
            user_id=user.id,
            token_hash=hash_verification_token(raw_token),
            expires_at=expires_at,
            sent_to_email=user.email,
        )
        return raw_token

    async def send_verification_email_best_effort(
        self,
        user: User,
        raw_token: str,
    ) -> bool:
        try:
            verification_url = build_verification_url(raw_token, self.settings)
            message = build_email_verification_email(
                user_email=user.email,
                verification_url=verification_url,
                expire_hours=self.settings.email_verification_token_expire_hours,
            )
            result = self.email_service.send_email(message)
            if result.dry_run:
                logger.info(
                    "Email verification dry-run: user_id=%s to=%s",
                    user.id,
                    user.email,
                )
            elif result.sent:
                logger.info(
                    "Email verification sent: user_id=%s to=%s",
                    user.id,
                    user.email,
                )
            else:
                logger.warning(
                    "Email verification not sent: user_id=%s reason=%s",
                    user.id,
                    result.message,
                )
            return result.sent or result.dry_run
        except Exception:
            logger.warning(
                "Email verification send failed: user_id=%s",
                user.id,
                exc_info=True,
            )
            return False

    async def verify_email_token(self, token: str) -> User:
        token_hash = hash_verification_token(token.strip())
        now = datetime.now(UTC)
        record = await self.tokens.get_valid_by_token_hash(token_hash, now=now)
        if record is None:
            raise EmailVerificationTokenInvalidError()

        user = await self.users.get_by_id(record.user_id)
        if user is None:
            raise EmailVerificationTokenInvalidError()

        await self.tokens.mark_used(record, used_at=now)
        user.email_verified_at = now
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def resend_email_verification(self, user: User) -> EmailVerificationResendResult:
        if user.email_verified_at is not None:
            return EmailVerificationResendResult(
                sent=False,
                already_verified=True,
            )

        raw_token = await self.create_email_verification_token(user)
        sent = await self.send_verification_email_best_effort(user, raw_token)
        await self.session.commit()

        if sent:
            return EmailVerificationResendResult(
                sent=True,
                already_verified=False,
            )
        return EmailVerificationResendResult(
            sent=False,
            already_verified=False,
            message="Verification email could not be sent. Try again later.",
        )
