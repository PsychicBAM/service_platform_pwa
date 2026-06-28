from __future__ import annotations

import hashlib
import logging
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.exceptions.auth import PasswordResetTokenInvalidError
from app.repositories.password_reset_repository import PasswordResetRepository
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailService
from app.services.email_templates import build_password_reset_email
from app.services.password_service import hash_password

logger = logging.getLogger(__name__)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_reset_url(raw_token: str, settings: Settings | None = None) -> str:
    resolved = settings or get_settings()
    base = resolved.password_reset_base_url.rstrip("/")
    return f"{base}?{urlencode({'token': raw_token})}"


@dataclass(frozen=True)
class PasswordResetRequestResult:
    sent: bool = True


class PasswordResetService:
    def __init__(
        self,
        session: AsyncSession,
        email_service: EmailService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.tokens = PasswordResetRepository(session)
        self.users = UserRepository(session)
        self.email_service = email_service or EmailService(settings=self.settings)

    async def request_password_reset(self, email: str) -> PasswordResetRequestResult:
        normalized = email.strip().lower()
        user = await self.users.get_by_email(normalized)
        if user is None or not user.is_active:
            return PasswordResetRequestResult()

        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(
            hours=self.settings.password_reset_token_expire_hours
        )
        await self.tokens.create(
            user_id=user.id,
            token_hash=hash_reset_token(raw_token),
            expires_at=expires_at,
            sent_to_email=user.email,
        )
        await self.send_reset_email_best_effort(user.email, raw_token)
        await self.session.commit()
        return PasswordResetRequestResult()

    async def send_reset_email_best_effort(
        self,
        user_email: str,
        raw_token: str,
    ) -> bool:
        try:
            reset_url = build_reset_url(raw_token, self.settings)
            message = build_password_reset_email(
                user_email=user_email,
                reset_url=reset_url,
                expire_hours=self.settings.password_reset_token_expire_hours,
            )
            result = self.email_service.send_email(message)
            if result.dry_run:
                logger.info("Password reset dry-run: to=%s", user_email)
            elif result.sent:
                logger.info("Password reset email sent: to=%s", user_email)
            else:
                logger.warning(
                    "Password reset email not sent: to=%s reason=%s",
                    user_email,
                    result.message,
                )
            return result.sent or result.dry_run
        except Exception:
            logger.warning(
                "Password reset send failed: to=%s",
                user_email,
                exc_info=True,
            )
            return False

    async def reset_password(self, token: str, new_password: str) -> None:
        token_hash = hash_reset_token(token.strip())
        now = datetime.now(UTC)
        record = await self.tokens.get_valid_by_token_hash(token_hash, now=now)
        if record is None:
            raise PasswordResetTokenInvalidError()

        user = await self.users.get_by_id(record.user_id)
        if user is None or not user.is_active:
            raise PasswordResetTokenInvalidError()

        user.password_hash = hash_password(new_password)
        await self.tokens.mark_used(record, used_at=now)
        await self.session.commit()
        await self.session.refresh(user)
